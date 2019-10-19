'use strict';

const assert = require('assert');
const eachAsync = require('../../lib/helpers/cursor/eachAsync');

describe('eachAsync()', function() {
  it('exhausts large cursor without parallel calls (gh-8235)', function() {
    this.timeout(10000);
    
    let numInProgress = 0;
    let num = 0;
    const max = 1000;
    let processed = 0;

    function next(cb) {
      assert.equal(numInProgress, 0);
      ++numInProgress;
      setTimeout(function() {
        --numInProgress;
        if (num++ >= max) {
          return cb(null, null);
        }
        cb(null, { name: `doc${num}` });
      }, 0);
    }

    return eachAsync(next, () => Promise.resolve(++processed), { parallel: 8 }).
      then(() => assert.equal(processed, max));
  });
});