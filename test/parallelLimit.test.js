'use strict';

const assert = require('assert');
const parallelLimit = require('../lib/helpers/parallelLimit');

describe('parallelLimit', function() {
  it('works with zero functions', function(done) {
    parallelLimit([], 1, (err, res) => {
      assert.ifError(err);
      assert.deepEqual(res, []);
      done();
    });
  });

  it('executes functions in parallel', function(done) {
    let started = 0;
    let finished = 0;
    const fns = [
      cb => {
        ++started;
        setTimeout(() => {
          ++finished;
          setTimeout(cb, 0);
        }, 100);
      },
      cb => {
        ++started;
        setTimeout(() => {
          ++finished;
          setTimeout(cb, 0);
        }, 100);
      },
      cb => {
        assert.equal(started, 2);
        assert.ok(finished > 0);
        ++started;
        ++finished;
        setTimeout(cb, 0);
      }
    ];

    parallelLimit(fns, 2, (err) => {
      assert.ifError(err);
      assert.equal(started, 3);
      assert.equal(finished, 3);
      done();
    });
  });
});
