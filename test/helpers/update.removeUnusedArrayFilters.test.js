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

  it('keeps empty array filters so MongoDB reports the error', function() {
    const update = { $set: { 'arr.$[el].name': 'x' } };
    const options = { arrayFilters: [{}, { 'el.name': 'y' }] };

    removeUnusedArrayFilters(update, options);

    assert.deepStrictEqual(options.arrayFilters, [{}, { 'el.name': 'y' }]);
  });
});
