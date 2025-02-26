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

const MAX_BIGINT = 9223372036854775807n;
const MIN_BIGINT = -9223372036854775808n;
const ERROR_MESSAGE = `Mongoose only supports BigInts between ${MIN_BIGINT} and ${MAX_BIGINT} because MongoDB does not support arbitrary precision integers`;

module.exports = function castBigInt(val) {
  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }
  if (typeof val === 'bigint') {
    if (val > MAX_BIGINT || val < MIN_BIGINT) {
      throw new Error(ERROR_MESSAGE);
    }
    return val;
  }

  if (val instanceof Long) {
    return val.toBigInt();
  }

  if (typeof val === 'string' || typeof val === 'number') {
    val = BigInt(val);
    if (val > MAX_BIGINT || val < MIN_BIGINT) {
      throw new Error(ERROR_MESSAGE);
    }
    return val;
  }

  throw new Error(`Cannot convert value to BigInt: "${val}"`);
};
