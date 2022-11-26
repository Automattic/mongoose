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

  it('executes all documents and aggregates errors if continueOnError set (gh-6355)', async() => {
    const max = 3;
    let numCalled = 0;
    function next(cb) {
      setImmediate(() => {
        if (++numCalled > max) {
          return cb(null, null);
        }
        cb(null, { num: numCalled });
      });
    }

    function fn(doc) {
      return doc.num % 2 === 1 ? Promise.reject(new Error(`Doc number ${doc.num}`)) : null;
    }

    const err = await eachAsync(next, fn, { continueOnError: true }).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'EachAsyncMultiError');
    assert.ok(err.message.includes('Doc number 1'));
    assert.ok(err.message.includes('Doc number 3'));
    assert.equal(err.errors.length, 2);
    assert.equal(err.errors[0].message, 'Doc number 1');
    assert.equal(err.errors[1].message, 'Doc number 3');
  });

  it('returns aggregated error fetching documents with continueOnError (gh-6355)', async() => {
    const max = 3;
    let numCalled = 0;
    function next(cb) {
      setImmediate(() => {
        if (++numCalled > max) {
          return cb(null, null);
        }
        if (numCalled % 2 === 1) {
          return cb(new Error(`Fetching doc ${numCalled}`));
        }
        cb(null, { num: numCalled });
      });
    }

    function fn() {
      return null;
    }

    const err = await eachAsync(next, fn, { continueOnError: true }).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'EachAsyncMultiError', err);
    assert.ok(err.message.includes('Fetching doc 1'));
    assert.equal(err.errors.length, 1);
    assert.equal(err.errors[0].message, 'Fetching doc 1');
    assert.equal(numCalled, 1);
  });

  it('avoids mutating document batch with parallel (gh-12652)', async() => {
    const max = 100;
    let numCalled = 0;
    function next(cb) {
      setImmediate(() => {
        if (++numCalled > max) {
          return cb(null, null);
        }
        cb(null, { num: numCalled });
      });
    }

    let numDocsProcessed = 0;
    async function fn(batch) {
      numDocsProcessed += batch.length;
      const length = batch.length;
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(batch.length, length);
    }

    await eachAsync(next, fn, { parallel: 7, batchSize: 10 });
    assert.equal(numDocsProcessed, max);
  });

  it('using AbortSignal (gh-12173)', async function() {
    if (typeof AbortController === 'undefined') {
      return this.skip();
    }

    const ac = new AbortController();
    const signal = ac.signal;

    let numCalled = 0;
    const abortAfter = 2;
    let numNextCalls = 0;
    let numFnCalls = 0;
    function next(cb) {
      ++numNextCalls;
      setImmediate(() => {
        if (numCalled++ === abortAfter) {
          ac.abort();

          return setImmediate(() => {
            cb(null, { num: numCalled });
          });
        }

        cb(null, { num: numCalled });
      });
    }

    await eachAsync(next, () => ++numFnCalls, { signal });

    assert.equal(numNextCalls, 3);
    assert.equal(numCalled, 3);
    assert.equal(numFnCalls, 2);
  });
});
