'use strict';

const BigIntType = require('../types/bigint');
const assert = require('assert');

module.exports = function castBigInt(value) {
  if (value == null) {
    return value;
  }

  if (value instanceof BigIntType) {
    return value;
  }

  if (typeof value === 'string') {
    return BigIntType.fromString(value);
  }

  if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
    return new BigIntType(value);
  }
  if (typeof value === 'number') {
    return BigIntType.fromString(String(value));
  }

  if (typeof value.valueOf === 'function' && typeof value.valueOf() === 'string') {
    return BigIntType.fromString(value.valueOf());
  }

  assert.ok(false);
};
