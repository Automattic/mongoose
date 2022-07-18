'use strict';

const assert = require('assert');
const promiseOrCallback = require('../../lib/helpers/promiseOrCallback');

describe('promiseOrCallback()', () => {
  const myError = new Error('This is My Error');
  const myRes = 'My Res';
  const myOtherArg = 'My Other Arg';

  describe('apply callback', () => {
    it('without error', (done) => {
      promiseOrCallback(
        (error, arg, otherArg) => {
          assert.equal(arg, myRes);
          assert.equal(otherArg, myOtherArg);
          assert.equal(error, undefined);
          done();
        },
        (fn) => { fn(null, myRes, myOtherArg); }
      );
    });

    describe('with error', () => {
      it('without event emitter', (done) => {
        promiseOrCallback(
          (error) => {
            assert.equal(error, myError);
            done();
          },
          (fn) => { fn(myError); }
        );
      });

      it('with event emitter', (done) => {
        promiseOrCallback(
          () => { },
          (fn) => { return fn(myError); },
          {
            listeners: () => [1],
            emit: (eventType, error) => {
              assert.equal(eventType, 'error');
              assert.equal(error, myError);
              done();
            }
          }
        );
      });
    });
  });

  describe('chain promise', () => {
    describe('without error', () => {
      it('two args', (done) => {
        const promise = promiseOrCallback(
          null,
          (fn) => { fn(null, myRes); }
        );
        promise.then((res) => {
          assert.equal(res, myRes);
          done();
        });
      });

      it('more args', (done) => {
        const promise = promiseOrCallback(
          null,
          (fn) => { fn(null, myRes, myOtherArg); }
        );
        promise.then((args) => {
          assert.equal(args[0], myRes);
          assert.equal(args[1], myOtherArg);
          done();
        });
      });
    });

    describe('with error', () => {
      it('without event emitter', (done) => {
        const promise = promiseOrCallback(
          null,
          (fn) => { fn(myError); }
        );
        promise.catch((error) => {
          assert.equal(error, myError);
          done();
        });
      });


      it('with event emitter', (done) => {
        const promise = promiseOrCallback(
          null,
          (fn) => { return fn(myError); },
          {
            listeners: () => [1],
            emit: (eventType, error) => {
              assert.equal(eventType, 'error');
              assert.equal(error, myError);
            }
          }
        );
        promise.catch((error) => {
          assert.equal(error, myError);
          done();
        });
      });
    });
  });
});
