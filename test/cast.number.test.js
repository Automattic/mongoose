'use strict';

const assert = require('assert');
const castNumber = require('../lib/cast/number');

describe('castNumber()', function() {
  it('casts a numeric string to a number', function() {
    assert.strictEqual(castNumber('42'), 42);
  });

  it('casts a float string to a number', function() {
    assert.strictEqual(castNumber('3.14'), 3.14);
  });

  it('returns null when given null', function() {
    assert.strictEqual(castNumber(null), null);
  });

  it('returns undefined when given undefined', function() {
    assert.strictEqual(castNumber(undefined), undefined);
  });

  it('casts a Number instance to a primitive', function() {
    assert.strictEqual(castNumber(new Number(7)), 7);
  });

  it('casts a BigInt to a number', function() {
    assert.strictEqual(castNumber(BigInt(99)), 99);
  });

  it('throws a plain Error (not AssertionError) for a non-numeric string', function() {
    let err;
    try {
      castNumber('hello');
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'expected an error to be thrown');
    // Must be a plain Error, not an AssertionError
    assert.strictEqual(err.constructor.name, 'Error',
      `expected plain Error but got ${err.constructor.name}`);
    assert.ok(
      err.message.includes('Cast to Number failed'),
      `unexpected error message: "${err.message}"`
    );
  });

  it('throws a plain Error (not AssertionError) for an object', function() {
    let err;
    try {
      castNumber({});
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'expected an error to be thrown');
    assert.strictEqual(err.constructor.name, 'Error',
      `expected plain Error but got ${err.constructor.name}`);
  });

  it('throws a plain Error (not AssertionError) for an array', function() {
    let err;
    try {
      castNumber([1, 2]);
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'expected an error to be thrown');
    assert.strictEqual(err.constructor.name, 'Error',
      `expected plain Error but got ${err.constructor.name}`);
  });
});
