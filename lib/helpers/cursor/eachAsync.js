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
  const enqueue = asyncQueue();

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

    let error = null;
    for (let i = 0; i < parallel; ++i) {
      enqueue(fetch);
    }

    function fetch(done) {
      if (drained || error) {
        return done();
      }

      next(function(err, doc) {
        if (drained || error) {
          return done();
        }
        if (err != null) {
          error = err;
          callback(err);
          return done();
        }
        if (doc == null) {
          drained = true;
          callback(null);
          return done();
        }

        done();

        handleNextResult(doc, function(err) {
          if (err != null) {
            error = err;
            return callback(err);
          }

          setTimeout(() => enqueue(fetch), 0);
        });
      });
    }
  };

  return utils.promiseOrCallback(callback, cb => {
    iterate(cb);
  });
};

// `next()` can only execute one at a time, so make sure we always execute
// `next()` in series, while still allowing multiple `fn()` instances to run
// in parallel.
function asyncQueue() {
  const _queue = [];
  let inProgress = null;
  let id = 0;

  return function enqueue(fn) {
    if (_queue.length === 0 && inProgress == null) {
      inProgress = id++;
      return fn(_step);
    }
    _queue.push(fn);
  };

  function _step() {
    setTimeout(() => {
      inProgress = null;
      if (_queue.length > 0) {
        inProgress = id++;
        const fn = _queue.shift();
        fn(_step);
      }
    }, 0);
  }
}