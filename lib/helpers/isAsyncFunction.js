'use strict';

const { inspect } = require('util');

const primitiveTypes = new Set(['number', 'string', 'bigint', 'boolean', 'symbol']);
const isAsyncFunctionCache = new WeakMap();

module.exports = function isAsyncFunction(v) {
  if (primitiveTypes.has(typeof v)) {
    return false;
  }
  if (isAsyncFunctionCache.has(v)) {
    return isAsyncFunctionCache.get(v);
  }
  const result = typeof v === 'function' && inspect(v).indexOf('[AsyncFunction:') === 0 || false;
  isAsyncFunctionCache.set(v, result);
  return result;
};