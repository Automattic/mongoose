'use strict';

module.exports = parallelLimit;

/*!
 * Run `fn` over every entry of `params` with at most `limit` calls in flight at
 * a time, resolving to the results in input order. Currently only used by
 * `Model.insertMany()` to bound how many documents validate concurrently.
 */

async function parallelLimit(params, fn, limit) {
  if (!(limit > 0)) {
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
  let hasError = false;
  let firstError = null;

  function worker() {
    if (nextIndex >= length || hasError) {
      return undefined;
    }
    const index = nextIndex++;
    let promise;
    try {
      promise = Promise.resolve(fn(params[index], index));
    } catch (err) {
      if (!hasError) {
        hasError = true;
        firstError = err;
      }
      return undefined;
    }
    return promise.then(
      (val) => {
        results[index] = val;
        return worker();
      },
      (err) => {
        if (!hasError) {
          hasError = true;
          firstError = err;
        }
      }
    );
  }

  const workers = new Array(Math.min(Math.max(1, Math.floor(limit)), length));
  for (let i = 0; i < workers.length; ++i) {
    workers[i] = worker();
  }
  await Promise.all(workers);

  if (hasError) {
    throw firstError;
  }
  return results;
}
