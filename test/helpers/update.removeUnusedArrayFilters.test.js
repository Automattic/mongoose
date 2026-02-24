'use strict';

const assert = require('assert');
const removeUnusedArrayFilters = require('../../lib/helpers/update/removeUnusedArrayFilters');

describe('removeUnusedArrayFilters', function() {
  it('respects `$or` (gh-10696)', function() {
    const update = {
      $set: {
        'requests.$[i].status.aa': 'ON_GOING',
        'requests.$[i].status.bb': 'ON_GOING'
      }
    };
    const options = { arrayFilters: [{ $or: [{ 'i.no': 1 }] }] };

    removeUnusedArrayFilters(update, options);
    assert.deepEqual(options.arrayFilters, [{ $or: [{ 'i.no': 1 }] }]);
  });
});
