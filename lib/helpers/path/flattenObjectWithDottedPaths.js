'use strict';

const MongooseError = require('../../error/mongooseError');
const setDottedPath = require('../path/setDottedPath');
const util = require('util');

/**
 * Given an object that may contain dotted paths, flatten the paths out.
 * For example: `flattenObjectWithDottedPaths({ a: { 'b.c': 42 } })` => `{ a: { b: { c: 42 } } }`
 */

module.exports = function flattenObjectWithDottedPaths(obj) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    return;
  }
  // Avoid Mongoose docs
  if (obj.$__) {
    return;
  }
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    if (key.indexOf('.') !== -1) {
      try {
        delete obj[key];
        setDottedPath(obj, key, val);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err;
        }
        throw new MongooseError(`Conflicting dotted paths when setting document path, key: "${key}", value: ${util.inspect(val)}`);
      }
      continue;
    }

    flattenObjectWithDottedPaths(obj[key]);
  }
};