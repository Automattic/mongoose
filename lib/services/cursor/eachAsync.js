'use strict';

/*!
 * Module dependencies.
 */

var PromiseProvider = require('../../promise_provider');
var async = require('async');

/**
 * Execute `fn` for every document in the cursor. If `fn` returns a promise,
 * will wait for the promise to resolve before iterating on to the next one.
 * Returns a promise that resolves when done.
 *
 * @param {Function} next the thunk to call to get the next document
 * @param {Function} fn
 * @param {Object} options
 * @param {Function} [callback] executed when all docs have been processed
 * @return {Promise}
 * @api public
 * @method eachAsync
 */

module.exports = function eachAsync(next, fn, options, callback) {
  var Promise = PromiseProvider.get();
  var parallel = options.parallel || 1;

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
    if (parallel > 1) {
      var tasks = [];
      for (var i = 0; i < parallel; ++i) {
        tasks.push(next);
      }
      async.parallel(tasks, function(error, docs) {
        var initialLength = docs.length;
        docs = docs.filter(function(doc) {
          return doc != null;
        });
        var isDone = docs.length !== initialLength;
        var tasks = docs.map(function(doc) {
          return function(cb) { handleNextResult(doc, cb); };
        });
        async.parallel(tasks, function(error) {
          if (error) {
            return callback(error);
          }
          if (isDone) {
            return callback(null);
          }
          setTimeout(function() {
            iterate(callback);
          });
        });
      });
    } else {
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
    }
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
