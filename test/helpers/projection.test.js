'use strict';

const assert = require('assert');
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
