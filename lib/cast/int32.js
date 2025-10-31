'use strict';

const isBsonType = require('../helpers/isBsonType');
const assert = require('assert');

/**
 * Given a value, cast it to a Int32, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @return {Number}
 * @throws {Error} if `value` does not represent an integer, or is outside the bounds of an 32-bit integer.
 * @api private
 */

module.exports = function castInt32(val) {
  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }

  if (isBsonType(val, 'Long')) {
    val = Number(val);
  } else if (typeof val === 'string' || typeof val === 'boolean') {
    val = Number(val);
  } else if (typeof val !== 'number') {
    throw new Error('Invalid value for Int32: ' + val);
  }
  assert.ok(!isNaN(val));

  const INT32_MAX = 0x7FFFFFFF;
  const INT32_MIN = -0x80000000;

  if (val === (val | 0) &&
      val >= INT32_MIN &&
      val <= INT32_MAX
  ) {
    return val;
  }
  assert.ok(false);
};
