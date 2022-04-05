'use strict';

/*!
 * Module dependencies.
 */

const EachAsyncMultiError = require('../../error/eachAsyncMultiError');
const immediate = require('../immediate');
const promiseOrCallback = require('../promiseOrCallback');

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
  const batchSize = options.batchSize;
  const continueOnError = options.continueOnError;
  const aggregatedErrors = [];
  const enqueue = asyncQueue();

  return promiseOrCallback(callback, cb => {
    if (batchSize != null) {
      if (typeof batchSize !== 'number') {
        throw new TypeError('batchSize must be a number');
      } else if (!Number.isInteger(batchSize)) {
        throw new TypeError('batchSize must be an integer');
      } else if (batchSize < 1) {
        throw new TypeError('batchSize must be at least 1');
      }
    }

    iterate(cb);
  });

  function iterate(finalCallback) {
    let drained = false;
    let handleResultsInProgress = 0;
    let currentDocumentIndex = 0;
    let documentsBatch = [];

    let error = null;
    for (let i = 0; i < parallel; ++i) {
      enqueue(fetch);
    }

    function fetch(done) {
      if (drained || error) {
        return done();
      }

      next(function(err, doc) {
        if (drained || error != null) {
          return done();
        }
        if (err != null) {
          if (continueOnError) {
            aggregatedErrors.push(err);
          } else {
            error = err;
            finalCallback(err);
            return done();
          }
        }
        if (doc == null) {
          drained = true;
          if (handleResultsInProgress <= 0) {
            const finalErr = continueOnError ?
              createEachAsyncMultiError(aggregatedErrors) :
              error;

            finalCallback(finalErr);
          } else if (batchSize && documentsBatch.length) {
            handleNextResult(documentsBatch, currentDocumentIndex++, handleNextResultCallBack);
          }
          return done();
        }

        ++handleResultsInProgress;

        // Kick off the subsequent `next()` before handling the result, but
        // make sure we know that we still have a result to handle re: #8422
        immediate(() => done());

        if (batchSize) {
          documentsBatch.push(doc);
        }

        // If the current documents size is less than the provided patch size don't process the documents yet
        if (batchSize && documentsBatch.length !== batchSize) {
          immediate(() => enqueue(fetch));
          return;
        }

        const docsToProcess = batchSize ? documentsBatch : doc;

        function handleNextResultCallBack(err) {
          if (batchSize) {
            handleResultsInProgress -= documentsBatch.length;
            documentsBatch = [];
          } else {
            --handleResultsInProgress;
          }
          if (err != null) {
            if (continueOnError) {
              aggregatedErrors.push(err);
            } else {
              error = err;
              return finalCallback(err);
            }
          }
          if (drained && handleResultsInProgress <= 0) {
            const finalErr = continueOnError ?
              createEachAsyncMultiError(aggregatedErrors) :
              error;
            return finalCallback(finalErr);
          }

          immediate(() => enqueue(fetch));
        }

        handleNextResult(docsToProcess, currentDocumentIndex++, handleNextResultCallBack);
      });
    }
  }

  function handleNextResult(doc, i, callback) {
    let maybePromise;
    try {
      maybePromise = fn(doc, i);
    } catch (err) {
      return callback(err);
    }
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(
        function() { callback(null); },
        function(error) {
          callback(error || new Error('`eachAsync()` promise rejected without error'));
        });
    } else {
      callback(null);
    }
  }
};

// `next()` can only execute one at a time, so make sure we always execute
// `next()` in series, while still allowing multiple `fn()` instances to run
// in parallel.
function asyncQueue() {
  const _queue = [];
  let inProgress = null;
  let id = 0;

  return function enqueue(fn) {
    if (
      inProgress === null &&
      _queue.length === 0
    ) {
      inProgress = id++;
      return fn(_step);
    }
    _queue.push(fn);
  };

  function _step() {
    if (_queue.length !== 0) {
      inProgress = id++;
      const fn = _queue.shift();
      fn(_step);
    } else {
      inProgress = null;
    }
  }
}

function createEachAsyncMultiError(aggregatedErrors) {
  if (aggregatedErrors.length === 0) {
    return null;
  }

  return new EachAsyncMultiError(aggregatedErrors);
}