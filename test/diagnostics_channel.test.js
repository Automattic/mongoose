'use strict';

/**
 * Test node:diagnostics_channel tracing integration.
 * Requires Node.js >= 20 for tracingChannel support.
 */

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

let dc;
let hasTracingChannel;
try {
  dc = require('node:diagnostics_channel');
  hasTracingChannel = typeof dc.tracingChannel === 'function';
} catch {
  hasTracingChannel = false;
}

describe('diagnostics_channel', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));

  describe('Query.prototype.exec', function() {
    it('emits start and asyncEnd on success', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({ name: String });
      const M = db.model('TestDiagnosticsQuery', schema);
      await M.create({ name: 'x' });

      const events = [];
      const channels = dc.tracingChannel('mongoose:query:exec');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await M.findOne({ name: 'x' }).exec();
        assert.strictEqual(events.length, 2, 'start and asyncEnd');
        assert.strictEqual(events[0].name, 'start');
        assert.strictEqual(events[1].name, 'asyncEnd');
        assert.strictEqual(events[0].ctx.operation, 'findOne');
        assert.strictEqual(events[0].ctx.model, 'TestDiagnosticsQuery');
        assert.ok(events[0].ctx.collection);
        assert.ok(events[0].ctx.query);
      } finally {
        channels.unsubscribe(handler);
      }
    });

    it('emits start, error, and asyncEnd on failure', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({ name: String });
      schema.pre('findOne', function() {
        throw new Error('pre hook error');
      });
      const M = db.model('TestDiagnosticsQueryErr', schema);

      const events = [];
      const channels = dc.tracingChannel('mongoose:query:exec');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await assert.rejects(
          async() => {
            const q = M.findOne({ name: 'x' });
            await q.exec();
          },
          /pre hook error/
        );
        assert.strictEqual(events.length, 3, 'start, error, asyncEnd');
        assert.strictEqual(events[0].name, 'start');
        assert.strictEqual(events[1].name, 'error');
        assert.strictEqual(events[2].name, 'asyncEnd');
        assert.ok(events[1].ctx.error);
      } finally {
        channels.unsubscribe(handler);
      }
    });
  });

  describe('Aggregate.prototype.exec', function() {
    it('emits start and asyncEnd on success', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({ name: String, n: Number });
      const M = db.model('TestDiagnosticsAgg', schema);
      await M.create([{ name: 'a', n: 1 }, { name: 'b', n: 2 }]);

      const events = [];
      const channels = dc.tracingChannel('mongoose:aggregate:exec');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await M.aggregate([{ $match: {} }]).exec();
        assert.strictEqual(events.length, 2, 'start and asyncEnd');
        assert.strictEqual(events[0].name, 'start');
        assert.strictEqual(events[1].name, 'asyncEnd');
        assert.strictEqual(events[0].ctx.operation, 'aggregate');
        assert.strictEqual(events[0].ctx.model, 'TestDiagnosticsAgg');
        assert.ok(Array.isArray(events[0].ctx.pipeline));
      } finally {
        channels.unsubscribe(handler);
      }
    });

    it('emits start, error, and asyncEnd on failure', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({ name: String });
      schema.pre('aggregate', function() {
        throw new Error('aggregate pre hook error');
      });
      const M = db.model('TestDiagnosticsAggErr', schema);

      const events = [];
      const channels = dc.tracingChannel('mongoose:aggregate:exec');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await assert.rejects(
          async() => {
            await M.aggregate([{ $match: {} }]).exec();
          },
          /aggregate pre hook error/
        );
        assert.strictEqual(events.length, 3, 'start, error, asyncEnd');
        assert.strictEqual(events[1].name, 'error');
      } finally {
        channels.unsubscribe(handler);
      }
    });
  });

  describe('Model.prototype.save', function() {
    it('emits start and asyncEnd on success', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({ name: String });
      const M = db.model('TestDiagnosticsSave', schema);
      const doc = new M({ name: 'saved' });

      const events = [];
      const channels = dc.tracingChannel('mongoose:model:save');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await doc.save();
        assert.strictEqual(events.length, 2, 'start and asyncEnd');
        assert.strictEqual(events[0].name, 'start');
        assert.strictEqual(events[1].name, 'asyncEnd');
        assert.strictEqual(events[0].ctx.operation, 'save');
        assert.strictEqual(events[0].ctx.model, 'TestDiagnosticsSave');
      } finally {
        channels.unsubscribe(handler);
      }
    });

    it('emits start, error, and asyncEnd on failure', async function() {
      if (!hasTracingChannel) {
        this.skip();
      }

      const schema = new Schema({
        name: { type: String, required: true }
      });
      const M = db.model('TestDiagnosticsSaveErr', schema);
      const doc = new M({});

      const events = [];
      const channels = dc.tracingChannel('mongoose:model:save');
      const handler = {
        start(ctx) {
          events.push({ name: 'start', ctx });
        },
        asyncEnd(ctx) {
          events.push({ name: 'asyncEnd', ctx });
        },
        error(ctx) {
          events.push({ name: 'error', ctx });
        }
      };
      channels.subscribe(handler);

      try {
        await assert.rejects(
          async() => doc.save(),
          /Path `name` is required/
        );
        assert.strictEqual(events.length, 3, 'start, error, asyncEnd');
        assert.strictEqual(events[1].name, 'error');
        assert.ok(events[1].ctx.error);
      } finally {
        channels.unsubscribe(handler);
      }
    });
  });

  describe('zero overhead', function() {
    it('executes without subscribers (no tracing overhead)', async function() {
      const schema = new Schema({ name: String });
      const M = db.model('TestDiagnosticsNoSub', schema);
      await M.create({ name: 'x' });

      const res = await M.findOne({ name: 'x' }).exec();
      assert.ok(res);
      assert.strictEqual(res.name, 'x');
    });
  });
});
