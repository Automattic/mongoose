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
});
