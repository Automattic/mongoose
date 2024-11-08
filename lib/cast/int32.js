'use strict';

const assert = require('assert');

/**
 * Given a value, cast it to a Int32, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @return {Number}
 * @throws {Error} if `value` does not represent an integer, or is beyond the bounds of an 32-bit integer.
 * @api private
 */

module.exports = function castInt32(val) {
  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }

  if (typeof val === 'string' || typeof val === 'number') {

    const INT32_MAX = 0x7FFFFFFF;
    const INT32_MIN = -0x80000000;

    const _val = Number(val);

    if (_val !== _val | 0 && _val > INT32_MIN && _val < INT32_MAX) {
      return _val;
    }
    assert.ok(false);
  }
};
