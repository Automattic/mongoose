'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const setDefaultsOnInsert = require('../../lib/helpers/setDefaultsOnInsert');
const utils = require('../../lib/utils');

describe('setDefaultsOnInsert', function() {
  it('properly ignores nested paths (gh-6665)', function() {
    const schema = new Schema({
      nested1: {
        nested2: {
          name: String,
          count: { type: Number, default: 9001 }
        }
      }
    });

    const opts = { upsert: true, setDefaultsOnInsert: true };
    let update = { $setOnInsert: { 'nested1.nested2': { name: 'foo' } } };
    update = setDefaultsOnInsert({}, schema, update, opts);
    assert.deepEqual(
      utils.omit(update.$setOnInsert, ['_id']),
      { 'nested1.nested2': { name: 'foo' } }
    );
  });

  it('ignores defaults underneath single nested subdocs (gh-10660)', async function() {
    // Embedded Sub Document
    const EntitySchema = new Schema({
      _id: { type: String, default: () => 'test' },
      name: String,
      color: String
    });

    // Main Schema
    const AppointmentSchema = new Schema({
      date: Date,
      overhead: { type: EntitySchema }
    });

    const opts = { upsert: true };
    let update = { $set: { date: new Date() } };
    update = setDefaultsOnInsert({}, AppointmentSchema, update, opts);
    assert.ok(!update.$setOnInsert);
  });

  it('ignores defaults underneath maps (gh-11235)', function() {
    const PositionSchema = Schema({
      _id: false,
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    });

    const MapSchema = Schema({
      name: { type: String, default: null },
      enabled: { type: Boolean, default: false },
      positions: {
        type: Map,
        of: [PositionSchema],
        default: () => ({
          center: { x: 0, y: 0 },
          npc_1: { x: 15, y: 36 },
          npc_2: { x: 76, y: 52 }
        })
      }
    });

    const opts = { upsert: true };
    let update = { $set: { enabled: true } };
    update = setDefaultsOnInsert({}, MapSchema, update, opts);
    assert.ok(!update.$setOnInsert['positions.$*']);
    assert.ok(update.$setOnInsert['positions'] instanceof Map);
  });

  it('sets default if sibling of dotted path is $set (gh-11668)', async function() {
    const schema = new Schema({
      time: {
        hit: { type: Number, default: 0 },
        resolved: { type: Number, default: 42 }
      }
    });

    const opts = { upsert: true };
    let update = { $set: { 'time.hit': 100 } };
    update = setDefaultsOnInsert({}, schema, update, opts);

    assert.equal(update.$setOnInsert['time.resolved'], 42);
  });

  it('skips default if parent is $set (gh-12279)', function() {
    const SubscriptionsConfigSchema = Schema({
      hasPaidSubscription: { type: Boolean, required: true },
      hasPastDueInvoice: { type: Boolean, required: true }
    });

    const CustomerSchema = Schema({
      subscriptionsConfig: {
        type: SubscriptionsConfigSchema,
        required: true,
        default: { hasPaidSubscription: false, hasPastDueInvoice: false }
      }
    });

    const opts = {};
    let update = { $set: { 'subscriptionsConfig.hasPaidSubscription': 100 } };
    update = setDefaultsOnInsert({}, CustomerSchema, update, opts);

    assert.ok(!update.$setOnInsert);
  });
});
