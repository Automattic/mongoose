'use strict';

/**
 * Compares two index specifications to determine if they are equal.
 *
 * #### Example:
 *     isIndexSpecEqual({ a: 1, b: 1 }, { a: 1, b: 1 }); // true
 *     isIndexSpecEqual({ a: 1, b: 1 }, { b: 1, a: 1 }); // false
 *     isIndexSpecEqual({ a: 1, b: -1 }, { a: 1, b: 1 }); // false
 *
 * @param {Object} spec1 The first index specification to compare.
 * @param {Object} spec2 The second index specification to compare.
 * @returns {Boolean} Returns true if the index specifications are equal, otherwise returns false.
 */

module.exports = function isIndexSpecEqual(spec1, spec2) {
  const spec1Keys = Object.keys(spec1);
  const spec2Keys = Object.keys(spec2);

  if (spec1Keys.length !== spec2Keys.length) {
    return false;
  }

  for (let i = 0; i < spec1Keys.length; i++) {
    const key = spec1Keys[i];
    if (key !== spec2Keys[i] || spec1[key] !== spec2[key]) {
      return false;
    }
  }

  return true;
};
