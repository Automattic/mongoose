'use strict';

const setDottedPath = require('../path/setDottedPath');

/**
 * Given an object that may contain dotted paths, flatten the paths out.
 * For example: `flattenObjectWithDottedPaths({ a: { 'b.c': 42 } })` => `{ a: { b: { c: 42 } } }`
 */

module.exports = function flattenObjectWithDottedPaths(obj) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    return;
  }
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    if (key.indexOf('.') !== -1) {
      delete obj[key];
      setDottedPath(obj, key, val);
      continue;
    }

    flattenObjectWithDottedPaths(obj[key]);
  }
};