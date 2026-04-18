'use strict';

/**
 * Remove undefined values from an object or array.
 *
 * By default this function only removes top-level undefined values.
 * Pass `{ deep: true }` to recursively strip undefined values from
 * all nested plain objects and arrays as well.
 *
 * This function mutates `val` in place **and** returns it, matching
 * the existing behaviour of the shallow version.
 *
 * @param {any} val - the value to strip undefined from
 * @param {object} [options]
 * @param {boolean} [options.deep=false] - recurse into nested objects/arrays
 * @returns {any} the same `val` reference, mutated in place
 * @api public
 */

module.exports = function omitUndefined(val, options) {
  const deep = options != null && options.deep === true;
  return _omitUndefined(val, deep);
};

/**
 * Internal recursive worker.
 * @param {any} val
 * @param {boolean} deep
 * @returns {any}
 */
function _omitUndefined(val, deep) {
  if (val == null || typeof val !== 'object') {
    return val;
  }

  if (Array.isArray(val)) {
    for (let i = val.length - 1; i >= 0; --i) {
      if (val[i] === undefined) {
        val.splice(i, 1);
      } else if (deep) {
        _omitUndefined(val[i], deep);
      }
    }
    return val;
  }

  // Plain object (including Object.create(null))
  const keys = Object.keys(val);
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    if (val[key] === undefined) {
      delete val[key];
    } else if (deep) {
      _omitUndefined(val[key], deep);
    }
  }

  return val;
}