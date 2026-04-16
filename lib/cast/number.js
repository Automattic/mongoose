'use strict';

/**
 * Given a value, cast it to a number, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {any} value
 * @return {number}
 * @throws {Error} if `value` is not one of the allowed values
 * @api private
 */

module.exports = function castNumber(val) {
  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }

  if (typeof val === 'string' || typeof val === 'boolean') {
    val = Number(val);
  }

  if (isNaN(val)) {
    throw new Error('Cast to Number failed: value is not a valid number');
  }
  if (val instanceof Number) {
    return val.valueOf();
  }
  if (typeof val === 'number') {
    return val;
  }
  if (!Array.isArray(val) && typeof val.valueOf === 'function') {
    return Number(val.valueOf());
  }
  if (val.toString && !Array.isArray(val) && val.toString() == Number(val)) {
    return Number(val);
  }

  throw new Error('Cast to Number failed: value is not a valid number');
};
