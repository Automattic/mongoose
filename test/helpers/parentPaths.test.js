'use strict';

const assert = require('assert');
const parentPaths = require('../../lib/helpers/path/parentPaths');

describe('parentPaths', function() {
  it('first', function() {
    assert.deepEqual(parentPaths('first'), ['first']);
  });
  it('first.second', function() {
    assert.deepEqual(parentPaths('first.second'), ['first', 'first.second']);
  });
  it('first.', function() {
    assert.deepEqual(parentPaths('first.'), ['first', 'first.']);
  });
});
