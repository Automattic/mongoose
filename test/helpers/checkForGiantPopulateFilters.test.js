'use strict';

const assert = require('assert');
const checkForGiantPopulateFilters = require('../../lib/helpers/populate/checkForGiantPopulateFilters');

describe('checkForGiantPopulateFilters', function() {
  let maxFilterLength;

  beforeEach(function() {
    maxFilterLength = checkForGiantPopulateFilters.maxFilterLength;
    checkForGiantPopulateFilters.maxFilterLength = 3;
  });

  afterEach(function() {
    checkForGiantPopulateFilters.maxFilterLength = maxFilterLength;
  });

  it('leaves params without large $in filters unchanged', function() {
    const params = [
      [{ foreignField: new Set(['_id']) }, { _id: { $in: [1, 2, 3] } }, null, {}]
    ];

    const res = checkForGiantPopulateFilters(params);

    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0], params[0]);
  });

  it('splits params with large $in filters', function() {
    const param = [
      { foreignField: new Set(['_id']) },
      { _id: { $in: [1, 2, 3, 4, 5, 6, 7] }, name: 'test' },
      null,
      {}
    ];
    const res = checkForGiantPopulateFilters([param]);

    assert.strictEqual(res.length, 3);
    assert.deepStrictEqual(res.map(param => param[1]._id.$in), [
      [1, 2, 3],
      [4, 5, 6],
      [7]
    ]);
    assert.ok(res.every(param => param[1].name === 'test'));
    assert.deepStrictEqual(param[1]._id.$in, [1, 2, 3, 4, 5, 6, 7]);
  });

  it('does not split large user-specified $in filters on non-foreign fields', function() {
    const param = [{ foreignField: new Set(['_id']) }, {
      _id: { $in: [1, 2, 3, 4] },
      status: { $in: ['a', 'b', 'c', 'd'] }
    }, null, {}];

    const res = checkForGiantPopulateFilters([param]);

    assert.strictEqual(res.length, 2);
    assert.deepStrictEqual(res[0][1]._id.$in, [1, 2, 3]);
    assert.deepStrictEqual(res[0][1].status.$in, ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(res[1][1]._id.$in, [4]);
    assert.deepStrictEqual(res[1][1].status.$in, ['a', 'b', 'c', 'd']);
  });
});
