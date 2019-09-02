'use strict';

module.exports = parallelLimit;

/*!
 * ignore
 */

function parallelLimit(fns, limit, callback) {
  let numInProgress = 0;
  let numFinished = 0;
  let error = null;

  if (fns.length === 0) {
    return callback();
  }

  for (let i = 0; i < fns.length && i <= limit; ++i) {
    _start();
  }

  function _start() {
    fns[numFinished + numInProgress](_done(numFinished + numInProgress));
    ++numInProgress;
  }

  const results = [];

  function _done(index) {
    return (err, res) => {
      --numInProgress;
      ++numFinished;

      if (error != null) {
        return;
      }
      if (err != null) {
        error = err;
        return callback(error);
      }

      results[index] = res;

      if (numFinished === fns.length) {
        return callback(null, results);
      } else if (numFinished + numInProgress < fns.length) {
        _start();
      }
    };
  }
}
