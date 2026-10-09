'use strict';

/**
 * Given a value, cast it to a string, or throw an `Error` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {any} value
 * @return {string|null|undefined}
 * @throws {Error}
 * @api private
 */

module.exports = function castString(value) {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new Error('Arrays must have exactly one element to be cast to a string');
    }
    value = value[0];
    if (Array.isArray(value)) {
      throw new Error('Nested arrays cannot be cast to a string');
    }
  }

  // If null or undefined
  if (value == null) {
    return value;
  }

  // handle documents being passed
  if (typeof value?._id === 'string') {
    return value._id;
  }

  // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
  // **unless** its the default Object.toString, because "[object Object]"
  // doesn't really qualify as useful data
  if (value.toString &&
      value.toString !== Object.prototype.toString &&
      !Array.isArray(value)) {
    return value.toString();
  }

  throw new Error('Value does not have a custom toString() method');
};
