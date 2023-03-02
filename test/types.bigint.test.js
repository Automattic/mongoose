'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.bigint', function() {
  it('casts from type number', function() {
    const schema = new Schema({
      value: Schema.Types.BigInt
    });

    const Test = mongoose.model('cast_from_num', schema);

    const big = new Test({ value: 10000 });

    assert.strictEqual(big.value.toString(), '10000');
  });

  it('uses valueOf method if one exists', function() {
    const bigint = new Schema({
      value: Schema.Types.Decimal128
    });

    const BigNum = mongoose.model('use_valueOf', bigint);

    const obj = {
      str: '10123',
      valueOf: function() {
        return this.str;
      }
    };

    const big = new BigNum({ value: obj });

    assert.strictEqual(big.value.toString(), '10123');
  });
});
