'use strict';

const assert = require('assert');
const diagnosticsChannel = require('node:diagnostics_channel');
const start = require('./common');

describe('TracingChannel integration', function() {
  let db;

  beforeEach(async function() {
    db = await start().asPromise();
  });

  afterEach(async function() {
    if (db) {
      await db.close();
      db = null;
    }
  });

  it('emits tracing events for queries', async function() {
    const channels = diagnosticsChannel.tracingChannel('mongoose:query');
    const events = { start: [], end: [], asyncStart: [], asyncEnd: [], error: [] };

    const subscribers = {
      start(message) { events.start.push(message); },
      end(message) { events.end.push(message); },
      asyncStart(message) { events.asyncStart.push(message); },
      asyncEnd(message) { events.asyncEnd.push(message); },
      error(message) { events.error.push(message); }
    };

    channels.subscribe(subscribers);

    const schema = new db.base.Schema({ name: String });
    const Model = db.model('TracingQuery', schema, 'tracing_query_' + Date.now());

    await Model.create({ name: 'test' });
    await Model.findOne({ name: 'test' }).exec();

    channels.unsubscribe(subscribers);

    assert.ok(events.start.length >= 1, 'expected at least one start event');
    assert.ok(events.asyncEnd.length >= 1, 'expected at least one asyncEnd event');

    const ctx = events.start[0];
    assert.strictEqual(ctx.module, 'mongoose');
    assert.strictEqual(ctx.class, 'Query');
    assert.strictEqual(ctx.method, 'exec');
    assert.ok(typeof ctx.operation === 'string' && ctx.operation.length > 0);
    assert.strictEqual(ctx.collection, Model.collection.name);
    assert.strictEqual(ctx.database, db.name);
  });

  it('emits tracing events for aggregates', async function() {
    const channels = diagnosticsChannel.tracingChannel('mongoose:aggregate');
    const events = { start: [], end: [], asyncStart: [], asyncEnd: [], error: [] };

    const subscribers = {
      start(message) { events.start.push(message); },
      end(message) { events.end.push(message); },
      asyncStart(message) { events.asyncStart.push(message); },
      asyncEnd(message) { events.asyncEnd.push(message); },
      error(message) { events.error.push(message); }
    };

    channels.subscribe(subscribers);

    const schema = new db.base.Schema({ name: String, value: Number });
    const Model = db.model('TracingAggregate', schema, 'tracing_aggregate_' + Date.now());

    await Model.create([{ name: 'a', value: 1 }, { name: 'b', value: 2 }]);
    await Model.aggregate([{ $match: { value: { $gte: 1 } } }, { $group: { _id: null, total: { $sum: '$value' } } }]).exec();

    channels.unsubscribe(subscribers);

    assert.ok(events.start.length >= 1, 'expected at least one start event');
    assert.ok(events.asyncEnd.length >= 1, 'expected at least one asyncEnd event');

    const ctx = events.start[0];
    assert.strictEqual(ctx.module, 'mongoose');
    assert.strictEqual(ctx.class, 'Aggregate');
    assert.strictEqual(ctx.method, 'exec');
    assert.ok(Array.isArray(ctx.pipeline));
    assert.strictEqual(ctx.collection, Model.collection.name);
    assert.strictEqual(ctx.database, db.name);
  });

  it('emits tracing events for save()', async function() {
    const channels = diagnosticsChannel.tracingChannel('mongoose:save');
    const events = { start: [], end: [], asyncStart: [], asyncEnd: [], error: [] };

    const subscribers = {
      start(message) { events.start.push(message); },
      end(message) { events.end.push(message); },
      asyncStart(message) { events.asyncStart.push(message); },
      asyncEnd(message) { events.asyncEnd.push(message); },
      error(message) { events.error.push(message); }
    };

    channels.subscribe(subscribers);

    const schema = new db.base.Schema({ name: String });
    const Model = db.model('TracingSave', schema, 'tracing_save_' + Date.now());

    const doc = new Model({ name: 'test' });
    await doc.save();

    channels.unsubscribe(subscribers);

    assert.ok(events.start.length >= 1, 'expected at least one start event');
    assert.ok(events.asyncEnd.length >= 1, 'expected at least one asyncEnd event');

    const ctx = events.start[0];
    assert.strictEqual(ctx.module, 'mongoose');
    assert.strictEqual(ctx.class, 'Model');
    assert.strictEqual(ctx.method, 'save');
    assert.ok(ctx.operation === 'insert' || ctx.operation === 'update');
    assert.strictEqual(ctx.collection, Model.collection.name);
    assert.strictEqual(ctx.database, db.name);
    assert.strictEqual(ctx.document.constructor, Model);
  });
});
