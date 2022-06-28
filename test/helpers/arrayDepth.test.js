'use strict';

const assert = require('assert');
const arrayDepth = require('../../lib/helpers/arrayDepth');

describe('arrayDepth', function() {
  it('non-array', function() {
    assert.deepEqual(arrayDepth('a'), { min: 0, max: 0, containsNonArrayItem: true });
  });
  it('simple array with no element', function() {
    assert.deepEqual(arrayDepth([]), { min: 1, max: 1, containsNonArrayItem: false });
  });
  it('simple array with one element', function() {
    assert.deepEqual(arrayDepth(['a']), { min: 1, max: 1, containsNonArrayItem: false });
  });
  it('simple array with many elements', function() {
    assert.deepEqual(arrayDepth(['a', 'b']), { min: 1, max: 1, containsNonArrayItem: true });
  });
  it('simple array with many elements', function() {
    assert.deepEqual(arrayDepth(['a', 'b', 'c']), { min: 1, max: 1, containsNonArrayItem: true });
  });
  it('complex array with one sub-Array', function() {
    assert.deepEqual(arrayDepth(['a', ['b'], 'c']), { min: 1, max: 2, containsNonArrayItem: true });
  });
  it('complex array with deeply nested sub-Arrays', function() {
    assert.deepEqual(arrayDepth([[[['a']]], ['b'], [[['c']]]]), { min: 2, max: 4, containsNonArrayItem: false });
  });
  it('complex array with deeply nested sub-Arrays', function() {
    assert.deepEqual(arrayDepth(['a', ['b'], [[['c']]]]), { min: 1, max: 4, containsNonArrayItem: true });
  });
  it('complex array with deeply nested sub-Arrays', function() {
    assert.deepEqual(arrayDepth([['a'], ['b'], [[['c']]]]), { min: 2, max: 4, containsNonArrayItem: false });
  });
});
