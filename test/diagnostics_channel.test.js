'use strict';

const mongoose = require('../lib');
const { Schema } = mongoose;
const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');
let dc;
try {
  dc = require('node:diagnostics_channel');
} catch (err) {
  dc = null;
}

describe('diagnostics_channel tracing', function() {
  let mongod;

  before(async function() {
    if (!dc || typeof dc.tracingChannel !== 'function') {
      this.skip();
    }
    this.timeout(10000);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  after(async function() {
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  });

  it('Query.prototype.exec emits tracing events', async function() {
    const Test = mongoose.model('TestQuery', new Schema({ name: String }));
    const events = [];

    const channel = dc.tracingChannel('mongoose:query');
    const subscriber = {
      start(ctx) { events.push({ name: 'start', ctx }); },
      asyncEnd(ctx) { events.push({ name: 'asyncEnd', ctx }); },
      error(ctx) { events.push({ name: 'error', ctx }); }
    };
    channel.subscribe(subscriber);

    await Test.find({ name: 'foo' }).exec();

    channel.unsubscribe(subscriber);

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].name, 'start');
    assert.strictEqual(events[1].name, 'asyncEnd');
    
    const ctx = events[0].ctx;
    assert.strictEqual(ctx.operation, 'find');
    assert.strictEqual(ctx.collection, 'testqueries');
    assert.deepStrictEqual(ctx.query, { name: 'foo' });
  });

  it('Aggregate.prototype.exec emits tracing events', async function() {
    const Test = mongoose.model('TestAgg', new Schema({ name: String }));
    const events = [];

    const channel = dc.tracingChannel('mongoose:aggregate');
    const subscriber = {
      start(ctx) { events.push({ name: 'start', ctx }); },
      asyncEnd(ctx) { events.push({ name: 'asyncEnd', ctx }); }
    };
    channel.subscribe(subscriber);

    await Test.aggregate([{ $match: { name: 'foo' } }]).exec();

    channel.unsubscribe(subscriber);

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].name, 'start');
    assert.strictEqual(events[1].name, 'asyncEnd');

    const ctx = events[0].ctx;
    assert.deepStrictEqual(ctx.pipeline, [{ $match: { name: 'foo' } }]);
    assert.strictEqual(ctx.collection, 'testaggs');
  });

  it('Model.prototype.save emits tracing events', async function() {
    const Test = mongoose.model('TestSave', new Schema({ name: String }));
    const events = [];

    const channel = dc.tracingChannel('mongoose:save');
    const subscriber = {
      start(ctx) { events.push({ name: 'start', ctx }); },
      asyncEnd(ctx) { events.push({ name: 'asyncEnd', ctx }); }
    };
    channel.subscribe(subscriber);

    const doc = new Test({ name: 'foo' });
    await doc.save();

    assert.strictEqual(events[0].ctx.operation, 'insert');

    // Update
    events.length = 0;
    doc.name = 'bar';
    await doc.save();

    channel.unsubscribe(subscriber);

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].name, 'start');
    assert.strictEqual(events[0].ctx.operation, 'update');
    assert.strictEqual(events[1].name, 'asyncEnd');
  });

  it('emits error events on failure', async function() {
    // Use a unique model name to avoid conflicts
    const Test = mongoose.model('TestErrorTrace', new Schema({ name: { type: String, required: true } }));
    const events = [];

    const channel = dc.tracingChannel('mongoose:save');
    const subscriber = {
      start(ctx) { events.push({ name: 'start', ctx }); },
      asyncEnd(ctx) { events.push({ name: 'asyncEnd', ctx }); },
      error(ctx) { events.push({ name: 'error', ctx }); }
    };
    channel.subscribe(subscriber);

    const doc = new Test({});
    try {
      await doc.save();
    } catch (err) {
      // expected validation error
    }

    channel.unsubscribe(subscriber);

    assert.ok(events.find(e => e.name === 'error'), 'Should have emitted error event');
    assert.ok(events.find(e => e.name === 'asyncEnd'), 'Should have emitted asyncEnd event');
    const errorEvent = events.find(e => e.name === 'error');
    assert.ok(errorEvent.ctx.error, 'Error should be in context');
  });
});
