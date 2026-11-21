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
  // Fast path: there's nothing to bound, so kick everything off and wait once
  // instead of running the worker pool below.
  if (limit >= length) {
    for (let i = 0; i < length; ++i) {
      try {
        results[i] = fn(params[i], i);
      } catch (err) {
        // Stop launching, but still hand the calls already in flight to
        // `Promise.all()` so a later rejection from one of them is handled.
        results[i] = Promise.reject(err);
        results.length = i + 1;
        break;
      }
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

  const workers = [];
  for (let i = 0; i < limit; ++i) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (hasError) {
    throw firstError;
  }
  return results;
}
