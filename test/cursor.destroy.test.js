'use strict';

const assert = require('assert');
const { once } = require('events');
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

  for (const kind of ['query', 'aggregate']) {
    function createCursor(model = Model) {
      return kind === 'query' ? model.find().cursor({ batchSize: 1 }) :
        model.aggregate([{ $match: {} }]).cursor({ batchSize: 1 });
    }

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
