'use strict';

/**
 * Convert a string or array into a projection object. Treats `-foo` as
 * equivalent to `foo: 0` depending on `retainMinusPaths`. If `retainMinusPaths`
 * is true, then `-foo` will be included in the projection as `'-foo': 0`.
 *
 * @param {object|string|string[]} v
 * @param {boolean} [retainMinusPaths]
 * @return {object}
 */

module.exports = function parseProjection(v, retainMinusPaths) {
  const type = typeof v;

  if (type === 'string') {
    v = v.split(/\s+/);
  }
  if (!Array.isArray(v) && Object.prototype.toString.call(v) !== '[object Arguments]') {
    return v;
  }

  const len = v.length;
  const ret = {};
  for (let i = 0; i < len; ++i) {
    let field = v[i];
    if (!field) {
      continue;
    }
    const include = field.charAt(0) === '-' ? 0 : 1;
    if (!retainMinusPaths && include === 0) {
      field = field.slice(1);
    }
    ret[field] = include;
  }

  return ret;
};
