'use strict';

/*!
 * Module dependencies.
 */

var PromiseProvider = require('../../promise_provider');

/**
 * Execute `fn` for every document in the cursor. If `fn` returns a promise,
 * will wait for the promise to resolve before iterating on to the next one.
 * Returns a promise that resolves when done.
 *
 * @param {Function} fn
 * @param {Function} [callback] executed when all docs have been processed
 * @return {Promise}
 * @api public
 * @method eachAsync
 */

module.exports = function eachAsync(next, fn, callback) {
  var Promise = PromiseProvider.get();

  var handleNextResult = function(doc, callback) {
    var promise = fn(doc);
    if (promise && typeof promise.then === 'function') {
      promise.then(
        function() { callback(null); },
        function(error) { callback(error); });
    } else {
      callback(null);
    }
  };

  var iterate = function(callback) {
    return next(function(error, doc) {
      if (error) {
        return callback(error);
      }
      if (!doc) {
        return callback(null);
      }
      handleNextResult(doc, function(error) {
        if (error) {
          return callback(error);
        }
        // Make sure to clear the stack re: gh-4697
        setTimeout(function() {
          iterate(callback);
        }, 0);
      });
    });
  };

  return new Promise.ES6(function(resolve, reject) {
    iterate(function(error) {
      if (error) {
        callback && callback(error);
        return reject(error);
      }
      callback && callback(null);
      return resolve();
    });
  });
};
