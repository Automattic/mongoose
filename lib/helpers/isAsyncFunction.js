'use strict';

const { inspect } = require('util');

const isAsyncFunctionCache = new WeakMap();

module.exports = function isAsyncFunction(v) {
  if (isAsyncFunctionCache.has(v)) {
    return isAsyncFunctionCache.get(v);
  }
  const result = typeof v === 'function' && inspect(v).indexOf('[AsyncFunction:') === 0 || false;
  isAsyncFunctionCache.set(v, result);
  return result;
};