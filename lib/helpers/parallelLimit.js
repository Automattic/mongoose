'use strict';

module.exports = parallelLimit;

/*!
 * Run `fn` over every entry of `params` with at most `limit` calls in flight at
 * a time, resolving to the results in input order. Currently only used by
 * `Model.insertMany()` to bound how many documents validate concurrently.
 */

async function parallelLimit(params, fn, limit) {
  if (limit <= 0) {
    throw new Error('Limit must be positive');
  }

  const length = params.length;
  if (length === 0) {
    return [];
  }

  const results = new Array(length);
  // Fast path: there's nothing to bound, so kick everything off and wait once.
  // Avoids the per-task `Set` + `Promise.race` bookkeeping of a sliding window.
  if (limit >= length) {
    for (let i = 0; i < length; ++i) {
      results[i] = fn(params[i], i);
    }
    return Promise.all(results);
  }

  let nextIndex = 0;
  let firstError = null;

  function worker() {
    if (nextIndex >= length || firstError !== null) {
      return undefined;
    }
    const index = nextIndex++;
    return Promise.resolve(fn(params[index], index)).then(
      (val) => {
        results[index] = val;
        return worker();
      },
      (err) => {
        if (firstError === null) {
          firstError = err;
        }
      }
    );
  }

  const workers = new Array(Math.min(limit, length));
  for (let i = 0; i < workers.length; ++i) {
    workers[i] = worker();
  }
  await Promise.all(workers);

  if (firstError !== null) {
    throw firstError;
  }
  return results;
}
