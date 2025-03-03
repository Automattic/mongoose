'use strict';

const assert = require('assert');
const BSON = require('bson');
const isBsonType = require('../helpers/isBsonType');

/**
 * Given a value, cast it to a IEEE 754-2008 floating point, or throw an `Error` if the value
 * cannot be casted. `null`, `undefined`, and `NaN` are considered valid inputs.
 *
 * @param {Any} value
 * @return {Number}
 * @throws {Error} if `value` does not represent a IEEE 754-2008 floating point. If casting from a string, see [BSON Double.fromString API documentation](https://mongodb.github.io/node-mongodb-native/Next/classes/BSON.Double.html#fromString)
 * @api private
 */

module.exports = function castDouble(val) {
  if (val == null || val === '') {
    return null;
  }

  let coercedVal;
  if (isBsonType(val, 'Long')) {
    coercedVal = val.toNumber();
  } else if (typeof val === 'string') {
    try {
      coercedVal = BSON.Double.fromString(val);
      return coercedVal;
    } catch {
      assert.ok(false);
    }
  } else if (typeof val === 'object') {
    const tempVal = val.valueOf() ?? val.toString();
    // ex: { a: 'im an object, valueOf: () => 'helloworld' } // throw an error
    if (typeof tempVal === 'string') {
      try {
        coercedVal = BSON.Double.fromString(val);
        return coercedVal;
      } catch {
        assert.ok(false);
      }
    } else {
      coercedVal = Number(tempVal);
    }
  } else {
    coercedVal = Number(val);
  }

  return new BSON.Double(coercedVal);
};
