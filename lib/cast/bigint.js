'use strict';

const { Long } = require('bson');

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
    if (val > 9223372036854775807n || val < -9223372036854775808n) {
      throw new Error('Mongoose only supports BigInts between -9223372036854775808n and 9223372036854775807n because MongoDB does not support arbitrary precision integers');
    }
    return val;
  }

  if (val instanceof Long) {
    return val.toBigInt();
  }

  if (typeof val === 'string' || typeof val === 'number') {
    val = BigInt(val);
    if (val > 9223372036854775807n || val < -9223372036854775808n) {
      throw new Error('Mongoose only supports BigInts between -9223372036854775808n and 9223372036854775807n because MongoDB does not support arbitrary precision integers');
    }
    return val;
  }

  throw new Error(`Cannot convert value to BigInt: "${val}"`);
};
