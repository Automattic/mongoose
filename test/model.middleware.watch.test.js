'use strict';

const start = require('./common');
const assert = require('assert');
const sinon = require('sinon');
const { EventEmitter } = require('events');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware watch', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('hydrated change streams', function() {
    for (const [mode, middleware, expected] of [
      ['early event', false, { pre: 0, post: 0 }],
      ['late event', { pre: false }, { pre: 0, post: 1 }],
      ['callback', { post: false }, { pre: 1, post: 0 }],
      ['promise', false, { pre: 0, post: 0 }]
    ]) {
      it(`forwards selection through ${mode} hydration`, async function() {
        const ctx = await createTestContext({ middleware, hydrate: true });
        try {
          const event = await ctx.read(mode);

          assert.ok(event.fullDocument instanceof ctx.User);
          assert.strictEqual(event.fullDocument.name, 'Ann');
          assert.strictEqual(event.fullDocument.isNew, false);
          assert.strictEqual(event.fullDocument.isModified(), false);
          assert.deepStrictEqual(ctx.calls, expected);
          assert.deepStrictEqual(ctx.watch.firstCall.args[1], {
            fullDocument: 'updateLookup', session: ctx.session, batchSize: 5
          });
        } finally {
          await ctx.close();
        }
      });
    }

    for (const options of [{}, { hydrate: false }, { hydrate: true, omitDocument: true }]) {
      it(`retains raw events with ${JSON.stringify(options)}`, async function() {
        const ctx = await createTestContext({ middleware: false, ...options });
        try {
          const event = await ctx.read('promise');

          assert.strictEqual(event.operationType, 'insert');
          assert.strictEqual(event.fullDocument instanceof ctx.User, false);
          assert.strictEqual(event.fullDocument?.name, options.omitDocument ? undefined : 'Ann');
          assert.deepStrictEqual(ctx.calls, { pre: 0, post: 0 });
          assert.strictEqual(Object.hasOwn(ctx.watch.firstCall.args[1], 'middleware'), false);
          assert.strictEqual(Object.hasOwn(ctx.watch.firstCall.args[1], 'hydrate'), false);
        } finally {
          await ctx.close();
        }
      });
    }

    async function createTestContext({ middleware, hydrate, omitDocument = false }) {
      const calls = { pre: 0, post: 0 };
      const schema = new Schema({ name: String });
      schema.pre('init', function() { ++calls.pre; });
      schema.post('init', function() { ++calls.post; });
      const User = db.model('User', schema);
      await db.asPromise();
      const session = await db.startSession();
      const driver = new EventEmitter();
      driver.next = function(callback) {
        if (callback) {
          callback(null, createEvent());
          return;
        }
        return Promise.resolve(createEvent());
      };
      driver.close = async function() { driver.removeAllListeners(); };
      const watch = sinon.stub(User.collection, 'watch').returns(driver);
      const stream = User.watch([], { middleware, ...(hydrate === undefined ? {} : { hydrate }), fullDocument: 'updateLookup', session, batchSize: 5 });
      return { User, calls, watch, session, read, close };

      async function read(mode) {
        if (mode === 'callback') {
          await stream.$driverChangeStreamPromise;
          return new Promise((resolve, reject) => stream.next((err, value) => err ? reject(err) : resolve(value)));
        }
        if (mode === 'promise') {
          return stream.next();
        }
        if (mode === 'late event') {
          await stream.$driverChangeStreamPromise;
        }
        const result = new Promise(resolve => stream.once('change', resolve));
        await stream.$driverChangeStreamPromise;
        driver.emit('change', createEvent());
        return result;
      }

      function createEvent() {
        return { operationType: 'insert', ...(omitDocument ? {} : { fullDocument: { name: 'Ann' } }) };
      }

      async function close() {
        await stream.close();
        watch.restore();
        await session.endSession();
      }
    }
  });
});
