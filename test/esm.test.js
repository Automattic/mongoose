'use strict';

const mongoose = require('../');
const assert = require('assert');

describe('esm:', function() {
  it('should have default export', function() {
    assert.deepEqual(mongoose, mongoose.default);
  });
  it('should have mongoose export', function() {
    assert.deepEqual(mongoose, mongoose.mongoose);
  });
});
