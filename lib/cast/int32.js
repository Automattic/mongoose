'use strict';

const assert = require('assert');
const BSON = require('bson');

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

  let coercedVal;
  if (val instanceof BSON.Int32 || val instanceof BSON.Double) {
    coercedVal = val.value;
  } else if (val instanceof BSON.Long) {
    coercedVal = val.toNumber();
  } else {
    coercedVal = Number(val);
  }

  const INT32_MAX = 0x7FFFFFFF;
  const INT32_MIN = -0x80000000;

  if (coercedVal === (coercedVal | 0) &&
      coercedVal >= INT32_MIN &&
      coercedVal <= INT32_MAX
  ) {
    return coercedVal;
  }
  assert.ok(false);
};
