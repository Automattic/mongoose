'use strict';

const assert = require('assert');
const parallelLimit = require('../lib/helpers/parallelLimit');

describe('parallelLimit', function() {
  it('works with zero functions', async function() {
    const results = await parallelLimit([], value => Promise.resolve(value), 1);
    assert.deepEqual(results, []);
  });

  it('executes functions in parallel', async function() {
    let started = 0;
    let finished = 0;
    const params = [1, 2, 3];

    const fn = async() => {
      ++started;
      await new Promise(resolve => setTimeout(resolve, 10));
      ++finished;
      return finished;
    };

    const results = await parallelLimit(params, async(param, index) => {
      if (index === 2) {
        assert.equal(started, 2);
        assert.ok(finished > 0);
      }
      return fn();
    }, 2);

    assert.equal(started, 3);
    assert.equal(finished, 3);
    assert.deepStrictEqual(results, [1, 2, 3]);
  });

  it('rejects non-positive and NaN limits', async function() {
    await assert.rejects(
      () => parallelLimit([1, 2], value => Promise.resolve(value), NaN),
      /Limit must be positive/
    );
    await assert.rejects(
      () => parallelLimit([1, 2], value => Promise.resolve(value), 0),
      /Limit must be positive/
    );
  });

  it('rejects when fn rejects with null or throws synchronously while other workers are in flight', async function() {
    let rejected = false;
    let rejectionValue = 'unset';
    try {
      await parallelLimit([1, 2, 3], async(val) => {
        if (val === 2) {
          return Promise.reject(null);
        }
        return val;
      }, 2);
    } catch (err) {
      rejected = true;
      rejectionValue = err;
    }
    assert.equal(rejected, true);
    assert.equal(rejectionValue, null);

    let firstFinished = false;
    await assert.rejects(
      () => parallelLimit([1, 2, 3], (val) => {
        if (val === 1) {
          return new Promise(resolve => setTimeout(() => {
            firstFinished = true;
            resolve(val);
          }, 15));
        }
        if (val === 2) {
          throw new Error('sync boom');
        }
        return Promise.resolve(val);
      }, 2),
      /sync boom/
    );
    assert.equal(firstFinished, true);
  });
});
