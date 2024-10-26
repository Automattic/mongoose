'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const isInclusive = require('../../lib/helpers/projection/isInclusive');

describe('isInclusive', function() {
  it('handles $elemMatch (gh-14893)', function() {
    assert.strictEqual(isInclusive({ field: { $elemMatch: { test: new Date('2024-06-01') } }, otherProp: 1 }), true);
  });
});
