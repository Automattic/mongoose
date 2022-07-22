'use strict';

const assert = require('assert');
const getFunctionName = require('../../lib/helpers/getFunctionName');

describe('getFunctionName', () => {
  it('return fn.name', () => {
    assert.equal(getFunctionName({ name: 'fnName' }), 'fnName');
  });

  it('return function name', () => {
    assert.equal(getFunctionName(function fnName() {}), 'fnName');
  });

  it('return function functionName', () => {
    assert.equal(getFunctionName(function functionName() {}), 'functionName');
  });

  it('return undefined for arrow function', () => {
    // I can't say it's expected behavior, but is how it's behave.
    assert.equal(getFunctionName(() => []), undefined);
  });
});
