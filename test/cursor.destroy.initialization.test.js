'use strict';

const assert = require('assert');
const { once } = require('events');
const { Writable } = require('stream');
const { pipeline } = require('stream/promises');
const sinon = require('sinon');
const start = require('./common');
const mongoose = start.mongoose;

describe('cursor destruction without a driver cursor', function() {
  let db;

  before(async function() {
    db = start();
    await db.asPromise();
  });
  after(async function() {
    await db.close();
  });
  beforeEach(function() {
    db.deleteModel(/.*/);
  });
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('closes a connection-level aggregation cursor after its readiness event', async function() {
    const cursor = db.aggregate([{ $listCollections: {} }]).cursor();
    await once(cursor, 'cursor');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor.cursor.closed, true);
  });

  for (const kind of ['query', 'aggregate']) {
    function createCursor(hook, filter = {}) {
      const schema = new mongoose.Schema({ name: String });
      schema.pre(kind === 'query' ? 'find' : 'aggregate', hook);
      const Model = db.model('Test', schema);
      return kind === 'query' ? Model.find(filter).cursor() :
        Model.aggregate([{ $match: {} }]).cursor();
    }

    it(`finishes ${kind} destruction when driver cursor creation throws`, async function() {
      const creationError = new Error('cursor creation failed');
      const cursor = createCursor(async function() {});
      const collection = db.model('Test').collection;
      const createStub = sinon.stub(collection, kind === 'query' ? 'find' : 'aggregate').throws(creationError);
      const errors = [];
      cursor.on('error', error => errors.push(error));
      const closed = new Promise(resolve => cursor.once('close', resolve));
      try {
        cursor.destroy();
        await closed;
        assert.strictEqual(cursor.cursor, null);
        assert.strictEqual(cursor.closed, true);
        assert.deepStrictEqual(errors, [creationError]);
        assert.strictEqual(cursor.listenerCount('cursor'), 0);
        assert.strictEqual(cursor.listenerCount('error'), 1);
      } finally {
        createStub.restore();
      }
    });

    it(`does not repeat a ${kind} hook error passed to destroy by an error listener`, async function() {
      const hookError = new Error('pre hook failed');
      const cursor = createCursor(async function() { throw hookError; });
      const errors = [];
      cursor.on('error', error => {
        errors.push(error);
        cursor.destroy(error);
      });
      await new Promise(resolve => cursor.once('close', resolve));
      assert.strictEqual(cursor.closed, true);
      assert.deepStrictEqual(errors, [hookError]);
      assert.strictEqual(cursor.listenerCount('cursor'), 0);
      assert.strictEqual(cursor.listenerCount('error'), 1);
    });

    if (kind === 'query') {
      it('keeps waiting when a casting error is emitted before initialization completes', async function() {
        let finishHook;
        const hook = new Promise(resolve => { finishHook = resolve; });
        const cursor = createCursor(() => hook, { _id: 'not-an-object-id' });
        const ready = new Promise(resolve => cursor.once('cursor', resolve));
        const closed = new Promise(resolve => cursor.once('close', resolve));
        const failed = once(cursor, 'error');
        try {
          cursor.read(0);
          cursor.destroy();
          await failed;
          await new Promise(resolve => setImmediate(resolve));
          assert.strictEqual(cursor.closed, false);
          finishHook();
          await ready;
          await closed;
          assert.strictEqual(cursor.cursor.closed, true);
          assert.strictEqual(cursor.listenerCount('error'), 0);
        } finally {
          finishHook();
          await ready;
          await cursor.cursor.close();
        }
      });

      it('waits for pending initialization despite an earlier query casting error', async function() {
        let finishHook;
        const hook = new Promise(resolve => { finishHook = resolve; });
        const cursor = createCursor(() => hook, { _id: 'not-an-object-id' });
        assert.ok(cursor._error instanceof mongoose.Error.CastError);
        const ready = once(cursor, 'cursor');
        const closed = new Promise(resolve => cursor.once('close', resolve));
        try {
          cursor.destroy();
          await new Promise(resolve => setImmediate(resolve));
          assert.strictEqual(cursor.closed, false);
          finishHook();
          await ready;
          await closed;
          assert.strictEqual(cursor.cursor.closed, true);
        } finally {
          finishHook();
          await ready;
          await cursor.cursor.close();
        }
      });
    }

    for (const destroyBeforeHook of [false, true]) {
      it(`finishes ${kind} destruction when initialization fails, destroy before hook: ${destroyBeforeHook}`, async function() {
        const hookError = new Error('pre hook failed');
        let finishHook;
        const hook = new Promise(resolve => { finishHook = resolve; });
        const cursor = createCursor(async function() {
          await hook;
          throw hookError;
        });
        const errors = [];
        cursor.on('error', error => errors.push(error));
        let closeCount = 0;
        cursor.on('close', () => ++closeCount);
        const failed = once(cursor, 'error');

        if (destroyBeforeHook) {
          cursor.destroy();
        }
        finishHook();
        await failed;
        cursor.destroy();
        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(cursor.cursor, null);
        assert.strictEqual(cursor.closed, true);
        assert.strictEqual(cursor._closed, true);
        assert.strictEqual(closeCount, 1);
        assert.deepStrictEqual(errors, [hookError]);
        assert.strictEqual(cursor.listenerCount('cursor'), 0);
        assert.strictEqual(cursor.listenerCount('error'), 1);
      });

      for (const skipValue of [undefined, null, []]) {
        it(`finishes skipped ${kind} destruction (${JSON.stringify(skipValue)}), destroy before hook: ${destroyBeforeHook}`, async function() {
          let finishHook;
          const hook = new Promise(resolve => { finishHook = resolve; });
          const cursor = createCursor(async function() {
            await hook;
            throw mongoose.skipMiddlewareFunction(skipValue);
          });
          const errors = [];
          cursor.on('error', error => errors.push(error));
          let closeCount = 0;
          cursor.on('close', () => ++closeCount);
          const ready = once(cursor, 'cursor');

          if (destroyBeforeHook) {
            cursor.destroy();
          }
          finishHook();
          await ready;
          cursor.destroy();
          await new Promise(resolve => setImmediate(resolve));

          assert.strictEqual(cursor.cursor, null);
          assert.strictEqual(cursor.closed, true);
          assert.strictEqual(cursor._closed, true);
          assert.strictEqual(closeCount, 1);
          assert.deepStrictEqual(errors, []);
          assert.strictEqual(cursor.listenerCount('cursor'), 0);
          assert.strictEqual(cursor.listenerCount('error'), 1);
        });
      }
    }

    it(`finishes destroying a ${kind} cursor after a pipeline pre-hook error`, async function() {
      const hookError = new Error('pre hook failed');
      const cursor = createCursor(async function() { throw hookError; });
      const destination = new Writable({
        objectMode: true,
        write(document, encoding, callback) { callback(); }
      });

      await assert.rejects(pipeline(cursor, destination), error => error === hookError);
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(cursor.cursor, null);
      assert.strictEqual(cursor.closed, true);
      assert.strictEqual(cursor._closed, true);
    });
  }
});
