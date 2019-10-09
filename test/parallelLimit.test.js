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
    let called = 0;
    const fns = [
      cb => {
        setTimeout(() => {
          ++called;
          setTimeout(cb, 0);
        }, 100);
      },
      cb => {
        setTimeout(() => {
          ++called;
          setTimeout(cb, 0);
        }, 100);
      },
      cb => {
        assert.equal(called, 2);
        ++called;
        setTimeout(cb, 100);
      }
    ];

    parallelLimit(fns, 2, (err) => {
      assert.ifError(err);
      assert.equal(called, 3);
      done();
    });
  });
});