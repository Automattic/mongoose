'use strict';

/*!
 * Given a value, cast it to a number, or throw an `Error` if the value
 * cannot be cast.
 *
 * @param {Any} value
 * @return {Number}
 * @throws {Error} if `value` is not castable to a number
 * @api private
 */

module.exports = function castNumber(val) {
  if (val == null) {
    return val;
  }

  // Support BigInt
  if (typeof val === 'bigint') {
    return Number(val);
  }

  if (val instanceof Number) {
    return val.valueOf();
  }

  // Handle string coercion
  val = Number(val);

  if (isNaN(val)) {
    throw new Error('Cast to Number failed: value is not a valid number');
  }

  return val;
};
