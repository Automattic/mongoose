'use strict';

const BSON = require('mongodb/lib/bson');
const isBsonType = require('../helpers/isBsonType');

/**
 * Given a value, cast it to a IEEE 754-2008 floating point, or throw an `Error` if the value
 * cannot be casted. `null`, `undefined` are considered valid inputs.
 * `NaN` is not considered valid in Mongoose 10+.
 *
 * @param {any} value
 * @return {number}
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
    coercedVal = BSON.Double.fromString(val);
    if (Number.isNaN(coercedVal.valueOf())) {
      throw new Error('NaN is not a valid double');
    }
    return coercedVal;
  } else if (typeof val === 'object') {
    const tempVal = val.valueOf() ?? val.toString();
    // ex: { a: 'im an object, valueOf: () => 'helloworld' } // throw an error
    if (typeof tempVal === 'string') {
      coercedVal = BSON.Double.fromString(tempVal);
      if (Number.isNaN(coercedVal.valueOf())) {
        throw new Error('NaN is not a valid double');
      }
      return coercedVal;
    } else {
      coercedVal = Number(tempVal);
    }
  } else {
    coercedVal = Number(val);
  }

  const ret = new BSON.Double(coercedVal);
  if (Number.isNaN(ret.valueOf())) {
    throw new Error('NaN is not a valid double');
  }
  return ret;
};
