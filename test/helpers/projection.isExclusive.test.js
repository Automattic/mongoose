'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const isExclusive = require('../../lib/helpers/projection/isExclusive');

describe('isExclusive', function() {
  it('handles $elemMatch (gh-14893)', function() {
    assert.strictEqual(isExclusive({ field: { $elemMatch: { test: new Date('2024-06-01') } }, otherProp: 1 }), false);
  });
});
