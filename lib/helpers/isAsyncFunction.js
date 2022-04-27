'use strict';

let asyncFunctionPrototype = null;
// try/catch for Babel compatibility, because Babel preset-env requires
// regenerator-runtime for async/await and we don't want to include that
// for a simple check.
try {
  asyncFunctionPrototype = Object.getPrototypeOf(async function() {});
} catch (err) {}

module.exports = function isAsyncFunction(v) {
  return (
    asyncFunctionPrototype != null &&
    typeof v === 'function' &&
    Object.getPrototypeOf(v) === asyncFunctionPrototype
  );
};
