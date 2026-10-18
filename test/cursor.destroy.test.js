'use strict';

const assert = require('assert');
const { once } = require('events');
const { Writable } = require('stream');
const { pipeline } = require('stream/promises');
const sinon = require('sinon');
const start = require('./common');
const mongoose = start.mongoose;

describe('cursor destroy errors', function() {
  let db;
  let Model;

  before(function() {
    db = start();
  });
  after(async function() {
    await db.close();
  });
  beforeEach(async function() {
    db.deleteModel(/.*/);
    Model = db.model('Test', new mongoose.Schema({ name: String }));
    await Model.create([{ name: 'first' }, { name: 'second' }]);
  });
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('emits an error observed through next() but not previously emitted by the cursor', async function() {
    const cursor = Model.find({ _id: 'invalid-object-id' }).cursor();
    await once(cursor, 'cursor');
    const castError = await cursor.next().catch(error => error);
    assert.ok(castError instanceof mongoose.Error.CastError);
    const errors = [];
    cursor.on('error', error => errors.push(error));
    const closed = new Promise(resolve => cursor.once('close', resolve));
    cursor.destroy(castError);
    await closed;
    assert.deepStrictEqual(errors, [castError]);
  });

  it('does not repeat a casting error emitted while destruction is waiting for cleanup', async function() {
    const cursor = Model.find({ _id: 'invalid-object-id' }).cursor();
    await once(cursor, 'cursor');
    const castError = await cursor.next().catch(error => error);
    assert.ok(castError instanceof mongoose.Error.CastError);
    let finishClose;
    const closeStub = sinon.stub(cursor.cursor, 'close').callsFake(() => new Promise(resolve => {
      finishClose = resolve;
    }));
    const errors = [];
    cursor.on('error', error => errors.push(error));
    const closed = new Promise(resolve => cursor.once('close', resolve));
    try {
      cursor.read(0);
      cursor.destroy(castError);
      await new Promise(resolve => setImmediate(resolve));
      assert.deepStrictEqual(errors, [castError]);
      finishClose();
      await closed;
      assert.deepStrictEqual(errors, [castError]);
    } finally {
      if (finishClose) {
        finishClose();
      }
      closeStub.restore();
      await cursor.cursor.close();
    }
  });

  for (const kind of ['query', 'aggregate']) {
    function createCursor(model = Model) {
      return kind === 'query' ? model.find().cursor({ batchSize: 1 }) :
        model.aggregate([{ $match: {} }]).cursor({ batchSize: 1 });
    }

    it(`does not re-emit a ${kind} read error when pipeline destroys the cursor`, async function() {
      const cursor = createCursor();
      await cursor.next();
      const readError = new Error('driver read failed');
      const nextStub = sinon.stub(cursor.cursor, 'next').rejects(readError);
      const errors = [];
      cursor.on('error', error => errors.push(error));
      const closed = new Promise(resolve => cursor.once('close', resolve));
      try {
        await assert.rejects(pipeline(cursor, new Writable({
          objectMode: true,
          write(document, encoding, callback) { callback(); }
        })), error => error === readError);
        await closed;
        assert.deepStrictEqual(errors, [readError]);
        assert.strictEqual(cursor.cursor.closed, true);
      } finally {
        nextStub.restore();
      }
    });

    it(`does not re-emit an earlier ${kind} read error after a close error`, async function() {
      const cursor = createCursor();
      await cursor.next();
      const readError = new Error('driver read failed');
      const closeError = new Error('driver close failed');
      const nextStub = sinon.stub(cursor.cursor, 'next').rejects(readError);
      const closeStub = sinon.stub(cursor.cursor, 'close').rejects(closeError);
      const errors = [];
      cursor.on('error', error => errors.push(error));
      const failed = once(cursor, 'error');
      const closed = new Promise(resolve => cursor.once('close', resolve));
      try {
        cursor.resume();
        await failed;
        await assert.rejects(cursor.close(), error => error === closeError);
        closeStub.restore();
        cursor.destroy(readError);
        await closed;
        assert.deepStrictEqual(errors, [readError, closeError]);
        assert.strictEqual(cursor.cursor.closed, true);
      } finally {
        nextStub.restore();
        closeStub.restore();
        await cursor.cursor.close();
      }
    });

    it(`preserves a distinct ${kind} destroy error with the same message as an emitted error`, async function() {
      const cursor = createCursor();
      await cursor.next();
      const readError = new Error('operation failed');
      const destroyError = new Error('operation failed');
      const nextStub = sinon.stub(cursor.cursor, 'next').rejects(readError);
      const errors = [];
      cursor.on('error', error => errors.push(error));
      cursor.once('error', () => cursor.destroy(destroyError));
      const closed = new Promise(resolve => cursor.once('close', resolve));
      try {
        cursor.resume();
        await closed;
        assert.deepStrictEqual(errors, [readError, destroyError]);
      } finally {
        nextStub.restore();
      }
    });

    it(`emits the supplied destroy error after closing a ${kind} cursor`, async function() {
      const cursor = createCursor();
      await cursor.next();
      const destroyError = new Error('consumer stopped reading');
      const events = [];
      cursor.on('error', error => events.push(error));
      const closed = new Promise(resolve => cursor.once('close', () => {
        events.push('close');
        resolve();
      }));

      cursor.destroy(destroyError);
      await closed;

      assert.deepStrictEqual(events, [destroyError, 'close']);
      assert.strictEqual(cursor.cursor.closed, true);
      assert.strictEqual(cursor.closed, true);
    });

    for (const hasError of [false, true]) {
      it(`waits for ${kind} cleanup before completing destroy with error: ${hasError}`, async function() {
        const cursor = createCursor();
        await cursor.next();
        const driverCursor = cursor.cursor;
        const destroyError = hasError ? new Error('consumer stopped reading') : undefined;
        let finishClose;
        const closeStub = sinon.stub(driverCursor, 'close').callsFake(() => new Promise(resolve => {
          finishClose = resolve;
        }));
        const errors = [];
        cursor.on('error', error => errors.push(error));
        const closed = new Promise(resolve => cursor.once('close', resolve));

        try {
          cursor.destroy(destroyError);
          await new Promise(resolve => setImmediate(resolve));
          assert.strictEqual(closeStub.callCount, 1);
          assert.strictEqual(cursor.closed, false);
          assert.deepStrictEqual(errors, []);
          finishClose();
          await closed;
          assert.deepStrictEqual(errors, hasError ? [destroyError] : []);
        } finally {
          if (finishClose) {
            finishClose();
          }
          closeStub.restore();
          await driverCursor.close();
        }
      });

      it(`reports ${kind} cleanup rejection when destroy has error: ${hasError}`, async function() {
        const cursor = createCursor();
        await cursor.next();
        const driverCursor = cursor.cursor;
        const closeError = new Error('driver close failed');
        const closeStub = sinon.stub(driverCursor, 'close').rejects(closeError);
        const errors = [];
        cursor.on('error', error => errors.push(error));
        const closed = new Promise(resolve => cursor.once('close', resolve));

        try {
          cursor.destroy(hasError ? new Error('consumer stopped reading') : undefined);
          await closed;
          assert.deepStrictEqual(errors, [closeError]);
          assert.strictEqual(closeStub.callCount, 1);
        } finally {
          closeStub.restore();
          await driverCursor.close();
        }
      });
    }

    it(`preserves destroy error while ${kind} initialization is pending`, async function() {
      let finishHook;
      const hook = new Promise(resolve => { finishHook = resolve; });
      const schema = new mongoose.Schema({ name: String });
      schema.pre(kind === 'query' ? 'find' : 'aggregate', () => hook);
      const Pending = db.model('Pending', schema);
      const cursor = createCursor(Pending);
      const destroyError = new Error('consumer stopped reading');
      const errors = [];
      cursor.on('error', error => errors.push(error));
      const closed = new Promise(resolve => cursor.once('close', resolve));
      const ready = once(cursor, 'cursor');

      cursor.destroy(destroyError);
      assert.strictEqual(cursor.cursor, null);
      finishHook();
      await ready;
      await closed;

      assert.deepStrictEqual(errors, [destroyError]);
      assert.strictEqual(cursor.cursor.closed, true);
    });
  }
});
