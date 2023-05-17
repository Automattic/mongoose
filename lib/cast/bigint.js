'use strict';

const assert = require('assert');

/**
 * Given a value, cast it to a BigInt, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @return {Number}
 * @throws {Error} if `value` is not one of the allowed values
 * @api private
 */

module.exports = function castBigInt(val) {
  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }
  if (typeof val === 'bigint') {
    return val;
  }

  if (typeof val === 'string' || typeof val === 'number') {
    return BigInt(val);
  }

  assert.ok(false);
};
