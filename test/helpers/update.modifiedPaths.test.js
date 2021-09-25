'use strict';

const assert = require('assert');
const modifiedPaths = require('../../lib/helpers/update/modifiedPaths');

describe('modifiedPaths', function() {
  it('works without any update operators', function() {
    const res = modifiedPaths({ a: 1, 'b.c': 2, d: { e: 1 } });
    assert.deepEqual(res, { a: true, b: true, 'b.c': true, d: true, 'd.e': true });
  });

  it('works with update operators', function() {
    const res = modifiedPaths({
      $inc: { a: 1 },
      $set: { 'b.c': 2 },
      $setOnInsert: { d: { e: 1 } }
    });
    assert.deepEqual(res, { a: true, b: true, 'b.c': true, d: true, 'd.e': true });
  });
});
