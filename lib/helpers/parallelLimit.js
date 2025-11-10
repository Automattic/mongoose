'use strict';

module.exports = parallelLimit;

/*!
 * ignore
 */

async function parallelLimit(params, fn, limit) {
  if (limit <= 0) {
    throw new Error('Limit must be positive');
  }

  if (params.length === 0) {
    return [];
  }

  const results = [];
  const executing = new Set();

  for (let index = 0; index < params.length; index++) {
    const param = params[index];
    const p = fn(param, index);
    results.push(p);

    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
