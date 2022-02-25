'use strict';

const assert = require('assert');
const isAsyncFunction = require('../../lib/helpers/isAsyncFunction');

describe('isAsyncFunction', function() {
  it('should return false for non-functions', () => {
    assert.ok(!isAsyncFunction('a'));
    assert.ok(!isAsyncFunction(1));
    assert.ok(!isAsyncFunction(1n));
    assert.ok(!isAsyncFunction({}));
    assert.ok(!isAsyncFunction(new Date()));
    assert.ok(!isAsyncFunction([]));
    assert.ok(!isAsyncFunction(true));
  });
  it('should return false for sync function', () => {
    assert.ok(!isAsyncFunction(function syncFunction() { return 'a';}));
  });
  it('should return true for async function', () => {
    assert.ok(isAsyncFunction(async function asyncFunction() { return 'a';}));
  });
  it('should return false for sync function returning a Promise', () => {
    assert.ok(!isAsyncFunction(function promiseReturningFunction() { return Promise.resolve('a');}));
  });
});
