'use strict';

const assert = require('assert');
const isPathSelectedInclusive = require('../../lib/helpers/projection/isPathSelectedInclusive');
const isSubpath = require('../../lib/helpers/projection/isSubpath');

describe('isSubpath', function() {
  it('handles single-part paths', function(done) {
    assert.equal(isSubpath('a', 'a'), true);
    assert.equal(isSubpath('a', 'b'), false);

    done();
  });

  it('handles multi-part paths', function(done) {
    assert.equal(isSubpath('a.b.c', 'a.b.c'), true);
    assert.equal(isSubpath('a.c.b', 'a.b.c'), false);
    assert.equal(isSubpath('a', 'a.b.c'), true);
    assert.equal(isSubpath('a.b.c', 'a'), false);

    done();
  });
});

describe('isPathSelectedInclusive', function() {
  it('handles single-part paths', function() {
    assert.equal(isPathSelectedInclusive({ a: 1 }, 'a'), true);
    assert.equal(isPathSelectedInclusive({ a: 1 }, 'b'), false);
    assert.equal(isPathSelectedInclusive({}, 'a'), false);
  });

  it('handles dotted paths', function() {
    assert.equal(isPathSelectedInclusive({ 'a.b': 1 }, 'a.b'), true);
    assert.equal(isPathSelectedInclusive({ 'a.b.c': 1 }, 'a.b.c'), true);
    assert.equal(isPathSelectedInclusive({ 'a.b': 1 }, 'a.c'), false);
    assert.equal(isPathSelectedInclusive({ 'a.b': 1 }, 'b'), false);
  });

  it('treats a selected ancestor as selecting its subpaths', function() {
    assert.equal(isPathSelectedInclusive({ a: 1 }, 'a.b'), true);
    assert.equal(isPathSelectedInclusive({ 'a.b': 1 }, 'a.b.c'), true);
    assert.equal(isPathSelectedInclusive({ 'a.b.c': 1 }, 'a.b'), false);
  });
});
