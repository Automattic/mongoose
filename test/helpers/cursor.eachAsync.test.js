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

  it('waits until the end before resolving the promise (gh-8352)', function() {
    const max = 2;
    let numCalled = 0;
    let numDone = 0;
    function next(cb) {
      setImmediate(() => {
        if (++numCalled > max) {
          return cb(null, null);
        }
        cb(null, { num: numCalled });
      });
    }

    function fn() {
      return new Promise(resolve => {
        setTimeout(() => {
          ++numDone;
          resolve();
        }, 100);
      });
    }

    return eachAsync(next, fn, { parallel: 3 }).
      then(() => assert.equal(numDone, max)).
      then(() => {
        numCalled = 0;
        numDone = 0;
      }).
      then(() => eachAsync(next, fn, { parallel: 2 })).
      then(() => assert.equal(numDone, max));
  });

  it('it processes the documents in batches successfully', () => {
    const batchSize = 3;
    let numberOfDocuments = 0;
    const maxNumberOfDocuments = 9;
    let numberOfBatchesProcessed = 0;

    function next(cb) {
      setTimeout(() => {
        if (++numberOfDocuments > maxNumberOfDocuments) {
          cb(null, null);
        }
        return cb(null, { id: numberOfDocuments });
      }, 0);
    }

    const fn = (docs, index) => {
      assert.equal(docs.length, batchSize);
      assert.equal(index, numberOfBatchesProcessed++);
    };

    return eachAsync(next, fn, { batchSize });
  });

  it('it processes the documents in batches even if the batch size % document count is not zero successfully', () => {
    const batchSize = 3;
    let numberOfDocuments = 0;
    const maxNumberOfDocuments = 10;
    let numberOfBatchesProcessed = 0;

    function next(cb) {
      setTimeout(() => {
        if (++numberOfDocuments > maxNumberOfDocuments) {
          cb(null, null);
        }
        return cb(null, { id: numberOfDocuments });
      }, 0);
    }

    const fn = (docs, index) => {
      assert.equal(index, numberOfBatchesProcessed++);
      if (index == 3) {
        assert.equal(docs.length, 1);
      }
      else {
        assert.equal(docs.length, batchSize);
      }
    };

    return eachAsync(next, fn, { batchSize });
  });

  it('it processes the documents in batches with the parallel option provided', () => {
    const batchSize = 3;
    const parallel = 3;
    let numberOfDocuments = 0;
    const maxNumberOfDocuments = 9;
    let numberOfBatchesProcessed = 0;

    function next(cb) {
      setTimeout(() => {
        if (++numberOfDocuments > maxNumberOfDocuments) {
          cb(null, null);
        }
        return cb(null, { id: numberOfDocuments });
      }, 0);
    }

    const fn = (docs, index) => {
      assert.equal(index, numberOfBatchesProcessed++);
      assert.equal(docs.length, batchSize);
    };

    return eachAsync(next, fn, { batchSize, parallel });
  });
});