'use strict';

/**
 * Convert a string or array into a projection object, retaining all
 * `-` and `+` paths.
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
    const include = '-' == field[0] ? 0 : 1;
    if (!retainMinusPaths && include === 0) {
      field = field.substring(1);
    }
    ret[field] = include;
  }

  removeConflictingProjections(ret);

  return ret;
};

function removeConflictingProjections(projection) {
  const keys = Object.keys(projection);
  for (const key of keys) {
    if (projection[key] === 0) {
      for (const other of keys) {
        if (other.startsWith(key + '.') && projection[other] === 0) {
          delete projection[other];
        }
      }
    }
  }
}
