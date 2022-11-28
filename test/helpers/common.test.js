'use strict';

const assert = require('assert');
const start = require('../common');

const modifiedPaths = require('../../lib/helpers/common').modifiedPaths;
const mongoose = start.mongoose;
const { Schema } = mongoose;


describe('modifiedPaths, bad update value which has circular reference field', () => {
  it('update value can be null', function() {
    modifiedPaths(null, 'path', null);
  });

  it('values with obvious error on circular reference', function() {
    const objA = {};
    objA.a = objA;

    assert.throws(() => modifiedPaths(objA, 'path', null), /circular reference/);
  });
});
