'use strict';

/*!
 * Module dependencies.
 */

const utils = require('../../utils');

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
  const parallel = options.parallel || 1;

  const handleNextResult = function(doc, callback) {
    const promise = fn(doc);
    if (promise && typeof promise.then === 'function') {
      promise.then(
        function() { callback(null); },
        function(error) { callback(error || new Error('`eachAsync()` promise rejected without error')); });
    } else {
      callback(null);
    }
  };

  const iterate = function(callback) {
    let drained = false;

    const getAndRun = function(cb) {
      _next(function(err, doc) {
        if (err) return cb(err);
        if (drained) {
          return;
        }
        if (doc == null) {
          drained = true;
          return callback(null);
        }
        handleNextResult(doc, function(err) {
          if (err) return cb(err);
          // Make sure to clear the stack re: gh-4697
          setTimeout(function() {
            getAndRun(cb);
          }, 0);
        });
      });
    };

    let error = null;
    for (let i = 0; i < parallel; ++i) {
      getAndRun(err => {
        if (error != null) {
          return;
        }
        if (err != null) {
          error = err;
          return callback(err);
        }
      });
    }
  };

  const _nextQueue = [];
  return utils.promiseOrCallback(callback, cb => {
    iterate(cb);
  });

  // `next()` can only execute one at a time, so make sure we always execute
  // `next()` in series, while still allowing multiple `fn()` instances to run
  // in parallel.
  function _next(cb) {
    if (_nextQueue.length === 0) {
      return next(_step(cb));
    }
    _nextQueue.push(cb);
  }

  function _step(cb) {
    return function(err, doc) {
      if (err != null) {
        return cb(err);
      }
      cb(null, doc);

      if (doc == null) {
        return;
      }

      setTimeout(() => {
        if (_nextQueue.length > 0) {
          next(_step(_nextQueue.unshift()));
        }
      }, 0);
    };
  }
};
