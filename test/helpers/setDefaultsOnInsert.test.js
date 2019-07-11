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
});
