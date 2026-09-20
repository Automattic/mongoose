'use strict';

/**
 * Given a value, cast it to a boolean, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {any} value
 * @return {boolean|null|undefined}
 * @throws {Error} if `value` is not one of the allowed values
 * @api private
 */

module.exports = function castBoolean(value) {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new Error('Arrays must have exactly one element to be cast to a boolean');
    }
    value = value[0];
    if (Array.isArray(value)) {
      throw new Error('Nested arrays cannot be cast to a boolean');
    }
  }

  if (value == null) {
    return value;
  }

  if (module.exports.convertToTrue.has(value)) {
    return true;
  }
  if (module.exports.convertToFalse.has(value)) {
    return false;
  }
  if (value === '') {
    throw new Error('Empty string cannot be cast to boolean');
  }

  throw new Error('Value is not a recognized boolean value');
};

module.exports.convertToTrue = new Set([true, 'true', 1, '1', 'yes']);
module.exports.convertToFalse = new Set([false, 'false', 0, '0', 'no']);
