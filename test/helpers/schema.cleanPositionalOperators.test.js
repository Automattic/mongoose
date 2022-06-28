'use strict';

const assert = require('assert');
const cleanPositionalOperators = require('../../lib/helpers/schema/cleanPositionalOperators');

describe('cleanPositionalOperators', function() {
  it('replaces trailing array filter', function() {
    assert.equal(cleanPositionalOperators('questions.$[q]'), 'questions.0');
  });

  it('replaces trailing $', function() {
    assert.equal(cleanPositionalOperators('questions.$'), 'questions.0');
  });

  it('replaces interior array filters', function() {
    assert.equal(cleanPositionalOperators('questions.$[q].$[r].test'), 'questions.0.0.test');
  });

  it('replaces interior elemMatch', function() {
    assert.equal(cleanPositionalOperators('questions.$.$.test'), 'questions.0.0.test');
  });
});
