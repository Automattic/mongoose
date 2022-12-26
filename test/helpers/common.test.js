'use strict';

const assert = require('assert');
const modifiedPaths = require('../../lib/helpers/common').modifiedPaths;

describe('modifiedPaths, bad update value which has circular reference field', () => {
  it('update value can be null', function() {
    modifiedPaths(null, 'path', null);
  });

  it('values with obvious error on circular reference', function() {
    const objA = {};
    objA.a = objA;

    assert.throws(() => modifiedPaths(objA, 'path', null), /circular reference/);
  });

  it('values with multiple references which are not circular should succeed', function() {
    const objA = {};
    const objB = { a: objA, b: objA };

    modifiedPaths(objB, 'path', null);
  });
});
