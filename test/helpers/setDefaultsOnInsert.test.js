'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const setDefaultsOnInsert = require('../../lib/helpers/setDefaultsOnInsert');
const utils = require('../../lib/utils');

describe('setDefaultsOnInsert', function() {
  it('properly ignores nested paths (gh-6665)', function(done) {
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
    assert.deepEqual(utils.omit(update.$setOnInsert, ['_id']),
      { 'nested1.nested2': { name: 'foo' } });

    done();
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
});
