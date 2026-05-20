'use strict';

const assert = require('assert');
const mongoose = require('../index');

const { queryChannel, aggregateChannel, cursorNextChannel } = require('../lib/tracing');

describe('TracingChannel', function() {
  let conn;
  let Test;
  let collectionName;

  before(async function() {
    conn = mongoose.createConnection(require('./common').uri);
    await conn.asPromise();
    const schema = new mongoose.Schema({
      name: String,
      age: Number
    });
    Test = conn.model('TracingTest', schema);
    collectionName = Test.collection.collectionName;
  });

  after(async function() {
    await Test.deleteMany({});
    await conn.close();
  });

  afterEach(async function() {
    await Test.deleteMany({});
  });

  describe('query operations', function() {
    it('fires start and asyncEnd for find', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() { events.push({ event: 'end' }); },
        asyncStart(ctx) { events.push({ event: 'asyncStart', result: ctx.result }); },
        asyncEnd(ctx) { events.push({ event: 'asyncEnd', result: ctx.result }); },
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.find({ name: 'test' });

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'find');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(start.database);
        assert.ok(start.serverAddress);
        assert.deepStrictEqual(start.args.filter, { name: 'test' });

        const asyncEnd = events.find(e => e.event === 'asyncEnd');
        assert.ok(asyncEnd, 'asyncEnd should fire');
        assert.ok(Array.isArray(asyncEnd.result), 'asyncEnd should include the result');
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for findOne', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.findOne({ name: 'test' });

        const start = events.find(e => e.event === 'start');
        assert.ok(start);
        assert.strictEqual(start.operation, 'findOne');
        assert.strictEqual(start.collection, collectionName);
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for updateOne', async function() {
      await Test.create({ name: 'update-test', age: 10 });

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.updateOne({ name: 'update-test' }, { age: 20 });

        const start = events.find(e => e.event === 'start');
        assert.ok(start);
        assert.strictEqual(start.operation, 'updateOne');
        assert.strictEqual(start.collection, collectionName);
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for deleteOne', async function() {
      await Test.create({ name: 'delete-test' });

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.deleteOne({ name: 'delete-test' });

        const start = events.find(e => e.event === 'start');
        assert.ok(start);
        assert.strictEqual(start.operation, 'deleteOne');
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires error event on query failure', async function() {
      const events = [];
      const handlers = {
        start() { events.push({ event: 'start' }); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.find({ $invalidOperator: true }).catch(() => {});

        assert.ok(events.some(e => e.event === 'start'), 'start should fire');
        assert.ok(events.some(e => e.event === 'error'), 'error should fire');
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('includes connection info in context', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push(ctx); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.find({});
        const ctx = events[0];
        assert.ok(ctx.database);
        assert.ok(ctx.serverAddress);
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });
  });

  describe('aggregate operations', function() {
    it('fires start and asyncEnd for aggregate', async function() {
      await Test.create([{ name: 'agg1', age: 10 }, { name: 'agg2', age: 20 }]);

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      aggregateChannel.channel.subscribe(handlers);
      try {
        await Test.aggregate([{ $match: { age: { $gte: 10 } } }]);

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'aggregate');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(start.database);
        assert.ok(Array.isArray(start.args.pipeline));
        assert.deepStrictEqual(start.args.pipeline[0], { $match: { age: { $gte: 10 } } });
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        aggregateChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for connection-level aggregate', async function() {
      await Test.create([{ name: 'conn-agg1', age: 10 }, { name: 'conn-agg2', age: 20 }]);

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd(ctx) { events.push({ event: 'asyncEnd', result: ctx.result }); },
        error() {}
      };

      aggregateChannel.channel.subscribe(handlers);
      try {
        await conn.aggregate([{ $documents: [{ x: 1 }] }]);

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'aggregate');
        assert.ok(start.database);
        assert.ok(Array.isArray(start.args.pipeline));

        const asyncEnd = events.find(e => e.event === 'asyncEnd');
        assert.ok(asyncEnd, 'asyncEnd should fire');
        assert.ok(Array.isArray(asyncEnd.result));
      } finally {
        aggregateChannel.channel.unsubscribe(handlers);
      }
    });
  });

  describe('save operations', function() {
    it('fires start and asyncEnd for save (insert)', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd(ctx) { events.push({ event: 'asyncEnd', result: ctx.result }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        const doc = new Test({ name: 'save-test', age: 25 });
        await doc.save();

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'save');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(start.database);

        const asyncEnd = events.find(e => e.event === 'asyncEnd');
        assert.ok(asyncEnd, 'asyncEnd should fire');
        assert.ok(asyncEnd.result, 'asyncEnd should include the result');
        assert.strictEqual(asyncEnd.result.name, 'save-test');
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for save (update)', async function() {
      const doc = await Test.create({ name: 'save-update', age: 10 });

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        doc.age = 20;
        await doc.save();

        const start = events.find(e => e.event === 'start');
        assert.ok(start);
        assert.strictEqual(start.operation, 'save');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires error event on save validation failure', async function() {
      const schema = new mongoose.Schema({
        email: { type: String, required: true }
      });
      const StrictModel = conn.model('TracingStrictTest', schema);

      const events = [];
      const handlers = {
        start() { events.push({ event: 'start' }); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      queryChannel.channel.subscribe(handlers);
      try {
        const doc = new StrictModel({});
        await doc.save().catch(() => {});

        assert.ok(events.some(e => e.event === 'start'), 'start should fire');
        assert.ok(events.some(e => e.event === 'error'), 'error should fire');
      } finally {
        queryChannel.channel.unsubscribe(handlers);
        await StrictModel.deleteMany({});
      }
    });
  });

  describe('model operations', function() {
    it('fires start and asyncEnd for insertMany', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.insertMany([
          { name: 'insert1', age: 10 },
          { name: 'insert2', age: 20 }
        ]);

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'insertMany');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(start.database);
        assert.ok(Array.isArray(start.args.docs));
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for bulkWrite', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      queryChannel.channel.subscribe(handlers);
      try {
        await Test.bulkWrite([
          { insertOne: { document: { name: 'bulk1', age: 30 } } }
        ]);

        const start = events.find(e => e.event === 'start');
        assert.ok(start, 'start event should fire');
        assert.strictEqual(start.operation, 'bulkWrite');
        assert.strictEqual(start.collection, collectionName);
        assert.ok(start.database);
        assert.ok(Array.isArray(start.args.ops));
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        queryChannel.channel.unsubscribe(handlers);
      }
    });
  });

  describe('cursor:next operations', function() {
    it('fires start and asyncEnd for query cursor next()', async function() {
      await Test.create([
        { name: 'cursor1', age: 10 },
        { name: 'cursor2', age: 20 }
      ]);

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() { events.push({ event: 'end' }); },
        asyncStart(ctx) { events.push({ event: 'asyncStart', result: ctx.result }); },
        asyncEnd(ctx) { events.push({ event: 'asyncEnd', result: ctx.result }); },
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      cursorNextChannel.channel.subscribe(handlers);
      try {
        const cursor = Test.find({ name: /^cursor/ }).sort({ name: 1 }).cursor();
        const doc1 = await cursor.next();
        const doc2 = await cursor.next();
        const doc3 = await cursor.next();

        assert.strictEqual(doc1.name, 'cursor1');
        assert.strictEqual(doc2.name, 'cursor2');
        assert.strictEqual(doc3, null);

        const starts = events.filter(e => e.event === 'start');
        assert.strictEqual(starts.length, 3, 'should fire start for each next() call');
        assert.strictEqual(starts[0].operation, 'find');
        assert.strictEqual(starts[0].collection, collectionName);
        assert.ok(starts[0].database);
        assert.strictEqual(starts[0].tailable, false);

        const asyncEnds = events.filter(e => e.event === 'asyncEnd');
        assert.strictEqual(asyncEnds.length, 3, 'should fire asyncEnd for each next() call');
      } finally {
        cursorNextChannel.channel.unsubscribe(handlers);
      }
    });

    it('includes batchSize in query cursor context', async function() {
      await Test.create([
        { name: 'batch1', age: 10 },
        { name: 'batch2', age: 20 }
      ]);

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error() {}
      };

      cursorNextChannel.channel.subscribe(handlers);
      try {
        const cursor = Test.find({ name: /^batch/ }).cursor({ batchSize: 10 });
        await cursor.next();

        const start = events.find(e => e.event === 'start');
        assert.strictEqual(start.batchSize, 10);
        assert.strictEqual(start.tailable, false);
      } finally {
        cursorNextChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires start and asyncEnd for aggregate cursor next()', async function() {
      await Test.create([
        { name: 'agg-cursor1', age: 10 },
        { name: 'agg-cursor2', age: 20 }
      ]);

      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() { events.push({ event: 'end' }); },
        asyncStart() {},
        asyncEnd(ctx) { events.push({ event: 'asyncEnd', result: ctx.result }); },
        error() {}
      };

      cursorNextChannel.channel.subscribe(handlers);
      try {
        const cursor = Test.aggregate([
          { $match: { name: /^agg-cursor/ } },
          { $sort: { name: 1 } }
        ]).cursor();

        const doc1 = await cursor.next();
        const doc2 = await cursor.next();
        const doc3 = await cursor.next();

        assert.strictEqual(doc1.name, 'agg-cursor1');
        assert.strictEqual(doc2.name, 'agg-cursor2');
        assert.strictEqual(doc3, null);

        const starts = events.filter(e => e.event === 'start');
        assert.strictEqual(starts.length, 3, 'should fire start for each next() call');
        assert.strictEqual(starts[0].operation, 'aggregate');
        assert.strictEqual(starts[0].collection, collectionName);
        assert.ok(starts[0].database);
        assert.ok(Array.isArray(starts[0].args.pipeline));
      } finally {
        cursorNextChannel.channel.unsubscribe(handlers);
      }
    });

    it('fires error event on cursor next() failure', async function() {
      const events = [];
      const handlers = {
        start() { events.push({ event: 'start' }); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      cursorNextChannel.channel.subscribe(handlers);
      try {
        const cursor = Test.find({ $invalidOperator: true }).cursor();
        await cursor.next().catch(() => {});

        assert.ok(events.some(e => e.event === 'start'), 'start should fire');
        assert.ok(events.some(e => e.event === 'error'), 'error should fire');
      } finally {
        cursorNextChannel.channel.unsubscribe(handlers);
      }
    });

    it('does not fire cursor:next events when using regular find()', async function() {
      await Test.create({ name: 'no-cursor', age: 5 });

      const events = [];
      const handlers = {
        start() { events.push({ event: 'start' }); },
        end() {},
        asyncStart() {},
        asyncEnd() {},
        error() {}
      };

      cursorNextChannel.channel.subscribe(handlers);
      try {
        await Test.find({ name: 'no-cursor' });
        assert.strictEqual(events.length, 0, 'cursor:next should not fire for regular find()');
      } finally {
        cursorNextChannel.channel.unsubscribe(handlers);
      }
    });
  });

  describe('zero-cost when no subscribers', function() {
    it('operations work without any subscribers', async function() {
      const doc = new Test({ name: 'no-sub', age: 5 });
      await doc.save();

      const found = await Test.find({ name: 'no-sub' });
      assert.strictEqual(found.length, 1);

      await Test.aggregate([{ $match: { name: 'no-sub' } }]);

      await Test.insertMany([{ name: 'no-sub-insert', age: 6 }]);

      await Test.bulkWrite([
        { insertOne: { document: { name: 'no-sub-bulk', age: 7 } } }
      ]);

      await Test.deleteMany({ name: /^no-sub/ });
    });

    it('cursor next() works without any subscribers', async function() {
      await Test.create({ name: 'no-sub-cursor', age: 5 });

      const cursor = Test.find({ name: 'no-sub-cursor' }).cursor();
      const doc = await cursor.next();
      assert.strictEqual(doc.name, 'no-sub-cursor');

      const done = await cursor.next();
      assert.strictEqual(done, null);
    });
  });
});
