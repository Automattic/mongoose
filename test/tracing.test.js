'use strict';

const assert = require('assert');
const mongoose = require('../index');

const { queryChannel, aggregateChannel, saveChannel, modelChannel } = require('../lib/tracing');

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

  describe('mongoose:query', function() {
    it('fires start and asyncEnd for find', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() { events.push({ event: 'end' }); },
        asyncStart() { events.push({ event: 'asyncStart' }); },
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error(ctx) { events.push({ event: 'error', error: ctx.error }); }
      };

      queryChannel.subscribe(handlers);
      try {
        await Test.find({ name: 'test' });

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent, 'start event should fire');
        assert.strictEqual(startEvent.operation, 'find');
        assert.strictEqual(startEvent.collection, collectionName);
        assert.deepStrictEqual(startEvent.query, { name: 'test' });
        assert.ok(startEvent.database);
        assert.ok(startEvent.serverAddress);
        assert.ok(events.some(e => e.event === 'asyncEnd'), 'asyncEnd should fire');
      } finally {
        queryChannel.unsubscribe(handlers);
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

      queryChannel.subscribe(handlers);
      try {
        await Test.findOne({ name: 'test' });

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent);
        assert.strictEqual(startEvent.operation, 'findOne');
        assert.strictEqual(startEvent.collection, collectionName);
      } finally {
        queryChannel.unsubscribe(handlers);
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

      queryChannel.subscribe(handlers);
      try {
        await Test.updateOne({ name: 'update-test' }, { age: 20 });

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent);
        assert.strictEqual(startEvent.operation, 'updateOne');
        assert.strictEqual(startEvent.collection, collectionName);
      } finally {
        queryChannel.unsubscribe(handlers);
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

      queryChannel.subscribe(handlers);
      try {
        await Test.deleteOne({ name: 'delete-test' });

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent);
        assert.strictEqual(startEvent.operation, 'deleteOne');
      } finally {
        queryChannel.unsubscribe(handlers);
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

      queryChannel.subscribe(handlers);
      try {
        await Test.find({ $invalidOperator: true }).catch(() => {});

        assert.ok(events.some(e => e.event === 'start'), 'start should fire');
        assert.ok(events.some(e => e.event === 'error'), 'error should fire');
      } finally {
        queryChannel.unsubscribe(handlers);
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

      queryChannel.subscribe(handlers);
      try {
        await Test.find({});
        const ctx = events[0];
        assert.ok(ctx.database);
        assert.ok(ctx.serverAddress);
      } finally {
        queryChannel.unsubscribe(handlers);
      }
    });
  });

  describe('mongoose:aggregate', function() {
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

      aggregateChannel.subscribe(handlers);
      try {
        await Test.aggregate([{ $match: { age: { $gte: 10 } } }]);

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent, 'start event should fire');
        assert.ok(Array.isArray(startEvent.pipeline));
        assert.deepStrictEqual(startEvent.pipeline[0], { $match: { age: { $gte: 10 } } });
        assert.strictEqual(startEvent.collection, collectionName);
        assert.ok(startEvent.database);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        aggregateChannel.unsubscribe(handlers);
      }
    });
  });

  describe('mongoose:save', function() {
    it('fires start and asyncEnd for save (insert)', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      saveChannel.subscribe(handlers);
      try {
        const doc = new Test({ name: 'save-test', age: 25 });
        await doc.save();

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent, 'start event should fire');
        assert.strictEqual(startEvent.operation, 'save');
        assert.strictEqual(startEvent.collection, collectionName);
        assert.ok(startEvent.database);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        saveChannel.unsubscribe(handlers);
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

      saveChannel.subscribe(handlers);
      try {
        doc.age = 20;
        await doc.save();

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent);
        assert.strictEqual(startEvent.operation, 'save');
        assert.strictEqual(startEvent.collection, collectionName);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        saveChannel.unsubscribe(handlers);
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

      saveChannel.subscribe(handlers);
      try {
        const doc = new StrictModel({});
        await doc.save().catch(() => {});

        assert.ok(events.some(e => e.event === 'start'), 'start should fire');
        assert.ok(events.some(e => e.event === 'error'), 'error should fire');
      } finally {
        saveChannel.unsubscribe(handlers);
        await StrictModel.deleteMany({});
      }
    });
  });

  describe('mongoose:model', function() {
    it('fires start and asyncEnd for insertMany', async function() {
      const events = [];
      const handlers = {
        start(ctx) { events.push({ event: 'start', ...ctx }); },
        end() {},
        asyncStart() {},
        asyncEnd() { events.push({ event: 'asyncEnd' }); },
        error() {}
      };

      modelChannel.subscribe(handlers);
      try {
        await Test.insertMany([
          { name: 'insert1', age: 10 },
          { name: 'insert2', age: 20 }
        ]);

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent, 'start event should fire');
        assert.strictEqual(startEvent.operation, 'insertMany');
        assert.strictEqual(startEvent.collection, collectionName);
        assert.ok(startEvent.database);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        modelChannel.unsubscribe(handlers);
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

      modelChannel.subscribe(handlers);
      try {
        await Test.bulkWrite([
          { insertOne: { document: { name: 'bulk1', age: 30 } } }
        ]);

        const startEvent = events.find(e => e.event === 'start');
        assert.ok(startEvent, 'start event should fire');
        assert.strictEqual(startEvent.operation, 'bulkWrite');
        assert.strictEqual(startEvent.collection, collectionName);
        assert.ok(startEvent.database);
        assert.ok(events.some(e => e.event === 'asyncEnd'));
      } finally {
        modelChannel.unsubscribe(handlers);
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
  });
});
