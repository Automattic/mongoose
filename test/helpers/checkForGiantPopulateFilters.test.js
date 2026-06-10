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

  it('splits large $in filters inside multi-foreignField $or queries', function() {
    // createPopulateQueryFilter produces this shape when a populate resolves
    // to more than one foreign field (e.g. a virtual with a `foreignField`
    // function returning different fields per document).
    const param = [
      { foreignField: new Set(['fieldA', 'fieldB']) },
      {
        $or: [
          { fieldA: { $in: [1, 2, 3, 4, 5] } },
          { fieldB: { $in: [1, 2, 3, 4, 5] } }
        ]
      },
      null,
      {}
    ];

    const res = checkForGiantPopulateFilters([param]);

    // The oversized `$in` arrays live inside `$or`, so they should still be split.
    assert.strictEqual(res.length, 2);
    // Every `$or` branch is sliced in lockstep so the union matches the original.
    assert.deepStrictEqual(res[0][1].$or, [
      { fieldA: { $in: [1, 2, 3] } },
      { fieldB: { $in: [1, 2, 3] } }
    ]);
    assert.deepStrictEqual(res[1][1].$or, [
      { fieldA: { $in: [4, 5] } },
      { fieldB: { $in: [4, 5] } }
    ]);
  });

  it('splits large $in filters nested under $elemMatch on a foreign field parent path', function() {
    const param = [
      { foreignField: new Set(['items.userId']) },
      { items: { $elemMatch: { userId: { $in: [1, 2, 3, 4, 5, 6, 7] }, active: true } } },
      null,
      {}
    ];

    const res = checkForGiantPopulateFilters([param]);

    assert.strictEqual(res.length, 3);
    assert.deepStrictEqual(res.map(p => p[1].items.$elemMatch.userId.$in), [
      [1, 2, 3],
      [4, 5, 6],
      [7]
    ]);
    assert.ok(res.every(p => p[1].items.$elemMatch.active));
    assert.deepStrictEqual(param[1].items.$elemMatch.userId.$in, [1, 2, 3, 4, 5, 6, 7]);
  });

});
