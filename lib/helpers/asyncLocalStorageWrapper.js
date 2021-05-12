'use strict';

let AsyncResource;
let executionAsyncId;
let isSupported = false;

try {
  const asyncHooks = require('async_hooks');
  if (
    typeof asyncHooks.AsyncResource.prototype.runInAsyncScope === 'function'
  ) {
    AsyncResource = asyncHooks.AsyncResource;
    executionAsyncId = asyncHooks.executionAsyncId;
    isSupported = true;
  }
} catch (e) {
  console.log('async_hooks does not support');
}

module.exports.wrap = function(callback) {
  if (isSupported && typeof callback === 'function') {
    const asyncResource = new AsyncResource('mongoose', executionAsyncId());
    return function() {
      try {
        // asyncResource.runInAsyncScope(callback, this, ...arguments);
        const params = [callback, this].concat(Array.from(arguments));
        asyncResource.runInAsyncScope.apply(asyncResource, params);
      } finally {
        asyncResource.emitDestroy();
      }
    };
  }
  return callback;
};
