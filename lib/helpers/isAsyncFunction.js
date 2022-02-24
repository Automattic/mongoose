'use strict';

const asyncFunctionPrototype = Object.getPrototypeOf(async function() {});

module.exports = function isAsyncFunction(v) {
  return (
    typeof v === 'function' &&
    Object.getPrototypeOf(v) === asyncFunctionPrototype
  );
};
