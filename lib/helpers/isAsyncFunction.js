'use strict';

const primitiveTypes = new Set(['undefined', 'number', 'string', 'bigint', 'boolean', 'symbol']);
const asyncFunctionPrototype = Object.getPrototypeOf(async function() {});

module.exports = function isAsyncFunction(v) {
  if (primitiveTypes.has(typeof v)) {
    return false;
  }
  return Object.getPrototypeOf(v) === asyncFunctionPrototype;
};