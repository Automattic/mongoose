'use strict';

const assert = require('assert');
const normalizeRefPath = require('../../lib/helpers/populate/normalizeRefPath');

const fakeDoc = Symbol.for('test:fakeDoc');

describe('normalizeRefPath', function() {
  it('handles functions', function() {
    const p = normalizeRefPath(fn, fakeDoc);
    assert.equal(p, 'test');

    function fn(doc) {
      assert.strictEqual(doc, fakeDoc);
      return 'test';
    }
  });

  it('handles numeric props', function() {
    let p = normalizeRefPath('a.c', fakeDoc, 'a.0.b');
    assert.equal(p, 'a.0.c');

    p = normalizeRefPath('a.b.d', fakeDoc, 'a.0.b.1.c');
    assert.equal(p, 'a.0.b.1.d');

    p = normalizeRefPath('a.b.d', fakeDoc, 'a.0.b.c');
    assert.equal(p, 'a.0.b.d');
  });

  it('throws if ends with numeric', function() {
    assert.throws(() => normalizeRefPath('a.c', fakeDoc, 'a.0.b.1'),
      /individual element/);
  });
});