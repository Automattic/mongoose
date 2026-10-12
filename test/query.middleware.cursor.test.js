'use strict';

const start = require('./common');
const assert = require('assert');
const sinon = require('sinon');
const { builtInMiddleware } = require('../lib/schema/symbols');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware query cursors', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('shared query cursor middleware selection', function() {
    for (const lean of [false, true]) {
      it(`captures selection before overlapping ${lean ? 'lean' : 'hydrated'} cursors open`, async function() {
        const ctx = await createTestContext({ holdOpening: true, lean });
        try {
          const first = ctx.open({ middleware: { pre: false } });
          await ctx.entered;
          assert.strictEqual(ctx.calls.findPre, 0);

          const second = ctx.open({ middleware: { post: false } });
          await second.getDriverCursor();
          ctx.release();
          await first.getDriverCursor();

          assert.strictEqual(ctx.calls.findPre, 1);
          await ctx.assertDocuments(first, { pre: 0, post: 1 });
          await ctx.assertDocuments(second, { pre: 1, post: 0 });
        } finally {
          await ctx.cleanup();
        }
      });
    }

    it('retains selection while shared cursors hydrate interleaved documents', async function() {
      const ctx = await createTestContext();
      try {
        const first = ctx.open({ middleware: false });
        await ctx.assertDocument(first, 'Alice', { pre: 0, post: 0 });

        const second = ctx.open({ middleware: true });
        await ctx.assertDocument(second, 'Alice', { pre: 1, post: 1 });

        await ctx.assertDocument(first, 'Bob', { pre: 0, post: 0 });
        await ctx.assertDocument(second, 'Bob', { pre: 1, post: 1 });
        assert.strictEqual(await first.next(), null);
        assert.strictEqual(await second.next(), null);
      } finally {
        await ctx.cleanup();
      }
    });

    it('copies phase selection before the shared option object changes', async function() {
      const ctx = await createTestContext({ holdOpening: true });
      try {
        const first = ctx.open({ middleware: { pre: false, post: false } });
        await ctx.entered;

        ctx.query.options.middleware.pre = true;
        ctx.query.options.middleware.post = true;
        const second = ctx.open();
        await second.getDriverCursor();
        ctx.release();

        await ctx.assertDocuments(first, { pre: 0, post: 0 });
        await ctx.assertDocuments(second, { pre: 1, post: 1 });
      } finally {
        await ctx.cleanup();
      }
    });

    it('preserves the query selection for later cursors', async function() {
      const ctx = await createTestContext();
      try {
        await ctx.assertDocuments(ctx.open({ middleware: false }), { pre: 0, post: 0 });

        const second = ctx.open();

        assert.strictEqual(ctx.query.options.middleware, false);
        await ctx.assertDocuments(second, { pre: 0, post: 0 });
      } finally {
        await ctx.cleanup();
      }
    });

    async function createTestContext({ holdOpening = false, lean = false } = {}) {
      const calls = { findPre: 0, findPost: 0, createPre: 0, initPre: 0, initPost: 0 };
      const schema = new Schema({ name: String, role: { type: String, default: 'reader' } });
      schema.pre('find', function() { ++calls.findPre; });
      schema.post('find', function() { ++calls.findPost; });
      schema.pre('createModel', function() { ++calls.createPre; });
      schema.pre('init', function() { ++calls.initPre; });
      schema.post('init', function() { ++calls.initPost; });
      let release;
      let signalEntered;
      const gate = new Promise(resolve => { release = resolve; });
      const entered = new Promise(resolve => { signalEntered = resolve; });
      let opening = 0;
      const preFind = async function() {
        if (++opening === 1 && holdOpening) {
          signalEntered();
          await gate;
        }
        this.setOptions({ comment: 'from-pre-find' });
      };
      // Keep the opening barrier active even when user pre hooks are suppressed.
      preFind[builtInMiddleware] = true;
      schema.pre('find', preFind);
      const User = db.model('User', schema);
      await User.collection.insertMany([{ name: 'Alice' }, { name: 'Bob' }]);
      const session = await db.startSession();
      const query = User.find().sort({ name: 1 }).batchSize(1).session(session).lean(lean);
      const findSpy = sinon.spy(User.collection, 'find');
      const cursors = [];
      return { calls, query, entered, release, open, assertDocument, assertDocuments, cleanup };

      function open(options) {
        const cursor = query.cursor(options);
        cursors.push(cursor);
        return cursor;
      }

      async function assertDocuments(cursor, expected) {
        await assertDocument(cursor, 'Alice', expected);
        await assertDocument(cursor, 'Bob', expected);
        const before = { ...calls };
        assert.strictEqual(await cursor.next(), null);
        assert.deepStrictEqual(calls, before);
      }

      async function assertDocument(cursor, name, { pre, post }) {
        await cursor.getDriverCursor();
        const before = { ...calls };
        const doc = await cursor.next();
        assert.strictEqual(doc.name, name);
        assert.deepStrictEqual(calls, {
          findPre: before.findPre,
          findPost: before.findPost + post,
          createPre: before.createPre + (lean ? 0 : 2 * pre),
          initPre: before.initPre + (lean ? 0 : pre),
          initPost: before.initPost + (lean ? 0 : post)
        });
        assert.strictEqual(doc instanceof User, !lean);
        if (!lean) {
          assert.strictEqual(doc.role, 'reader');
          assert.strictEqual(doc.isNew, false);
          assert.strictEqual(doc.isModified(), false);
          assert.strictEqual(doc.$session(), session);
        }
        assert.strictEqual(findSpy.callCount, cursors.length);
        for (const call of findSpy.getCalls()) {
          assert.strictEqual(Object.hasOwn(call.args[1], 'middleware'), false);
          assert.strictEqual(call.args[1].comment, 'from-pre-find');
          assert.strictEqual(call.args[1].session, session);
        }
      }

      async function cleanup() {
        release();
        try {
          await Promise.all(cursors.map(async cursor => {
            await cursor.getDriverCursor();
            await cursor.close();
          }));
        } finally {
          findSpy.restore();
          await session.endSession();
        }
      }
    }
  });


});
