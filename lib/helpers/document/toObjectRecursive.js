'use strict';

const isPOJO = require('../isPOJO');

/**
 * Convert nested path documents underneath POJOs and arrays to POJOs without
 * modifying the original value. Only clone containers that contain a nested
 * path document. Preserve regular document children so casting can handle
 * populated documents and subdocuments.
 */

module.exports = function toObjectRecursive(value, options) {
  return _toObjectRecursive(value, options, true, new Set());
};

function _toObjectRecursive(value, options, isRoot, seen) {
  if (value == null) {
    return value;
  }

  if (value.$__ != null && typeof value.toObject === 'function') {
    return isRoot || value.$__isNested ? value.toObject(options) : value;
  }

  if (!Array.isArray(value) && !isPOJO(value)) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  let ret = value;
  for (const key of Object.keys(value)) {
    const converted = _toObjectRecursive(value[key], options, false, seen);
    if (converted === value[key]) {
      continue;
    }

    if (ret === value) {
      ret = Array.isArray(value) ? Object.assign([], value) : { ...value };
    }
    ret[key] = converted;
  }

  seen.delete(value);
  return ret;
}
