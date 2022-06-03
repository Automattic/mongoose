'use strict';

module.exports = parallelLimit;

/*!
 * ignore
 */

function parallelLimit(fns, limit, callback) {
  const fnsLength = fns.length;
  let numInProgress = 0;
  let numFinished = 0;
  let error = null;

  if (limit <= 0) {
    throw new Error('Limit must be positive');
  }

  if (fnsLength === 0) {
    return callback(null, []);
  }

  for (let i = 0; i < fnsLength && i < limit; ++i) {
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

      if (numFinished === fnsLength) {
        return callback(null, results);
      } else if (numFinished + numInProgress < fnsLength) {
        _start();
      }
    };
  }
}
