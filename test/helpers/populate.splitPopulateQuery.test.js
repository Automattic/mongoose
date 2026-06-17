'use strict';

const assert = require('assert');
const splitPopulateQuery = require('../../lib/helpers/populate/splitPopulateQuery');

describe('splitPopulateQuery', function() {
  let maxInFilterLength;

  beforeEach(function() {
    maxInFilterLength = splitPopulateQuery.maxInFilterLength;
    splitPopulateQuery.maxInFilterLength = 3;
  });

  afterEach(function() {
    splitPopulateQuery.maxInFilterLength = maxInFilterLength;
  });

  function createMod(mod) {
    return {
      model: { schema: { path: () => null } },
      options: {},
      match: null,
      docs: mod.ids.map((_, i) => ({ i })),
      allIds: [...mod.ids],
      unpopulatedValues: [...mod.ids],
      foreignField: new Set(['_id']),
      isRefPath: false,
      ...mod
    };
  }

  it('returns null if the entry only has one document', function() {
    const mod = createMod({ ids: [[1, 2, 3, 4]] });
    assert.strictEqual(splitPopulateQuery(mod, [1, 2, 3, 4], null, {}), null);
  });

  it('returns null if the `$in` filter is within the limit', function() {
    const mod = createMod({ ids: [[1], [2]] });
    assert.strictEqual(splitPopulateQuery(mod, [1, 2], null, {}), null);
  });

  it('returns params for a separate query per document if the `$in` filter would be too big', function() {
    const select = { name: 1 };
    const assignmentOpts = { sort: { name: 1 } };
    const mod = createMod({ ids: [[1, 2], [3, 4]] });

    const params = splitPopulateQuery(mod, [1, 2, 3, 4], select, assignmentOpts);

    assert.equal(params.length, 2);
    for (let i = 0; i < params.length; ++i) {
      const [subMod, match, subSelect, subAssignmentOpts] = params[i];
      assert.deepStrictEqual(subMod.docs, [mod.docs[i]]);
      assert.deepStrictEqual(match._id.$in, mod.ids[i]);
      assert.strictEqual(subSelect, select);
      assert.strictEqual(subAssignmentOpts, assignmentOpts);
      assert.strictEqual(subMod._assignFromOwnResults, true);
    }
  });

  it('sets `match` to null for documents with no ids', function() {
    const mod = createMod({ ids: [[1, 2], [], [3, 4]] });

    const params = splitPopulateQuery(mod, [1, 2, 3, 4], null, {});

    assert.equal(params.length, 3);
    assert.deepStrictEqual(params[0][1]._id.$in, [1, 2]);
    assert.strictEqual(params[1][1], null);
    assert.deepStrictEqual(params[2][1]._id.$in, [3, 4]);
  });

  it('counts one copy of the ids per foreign field', function() {
    const mod = createMod({ ids: [[1], [2]], foreignField: new Set(['f1', 'f2']) });

    // Only 2 ids, but 2 foreign fields means the filter would contain 4 elements
    const params = splitPopulateQuery(mod, [1, 2], null, {});

    assert.equal(params.length, 2);
    assert.deepStrictEqual(params[0][1].$or, [{ f1: { $in: [1] } }, { f2: { $in: [1] } }]);
    assert.deepStrictEqual(params[1][1].$or, [{ f1: { $in: [2] } }, { f2: { $in: [2] } }]);
  });

  it('splits if `perDocumentLimit` is set, even if the `$in` filter is within the limit', function() {
    let mod = createMod({ ids: [[1], [2]], options: { perDocumentLimit: 1 } });
    assert.equal(splitPopulateQuery(mod, [1, 2], null, {}).length, 2);

    mod = createMod({ ids: [[1], [2]], options: { options: { perDocumentLimit: 1 } } });
    assert.equal(splitPopulateQuery(mod, [1, 2], null, {}).length, 2);
  });

  it('only splits refPath entries for `perDocumentLimit`, with assignment from all queries\' results', function() {
    let mod = createMod({ ids: [[1, 2], [3, 4]], isRefPath: true });
    assert.strictEqual(splitPopulateQuery(mod, [1, 2, 3, 4], null, {}), null);

    mod = createMod({ ids: [[1, 2], [3, 4]], isRefPath: true, options: { perDocumentLimit: 1 } });
    const params = splitPopulateQuery(mod, [1, 2, 3, 4], null, {});
    assert.equal(params.length, 2);
    assert.strictEqual(params[0][0]._assignFromOwnResults, false);
    assert.strictEqual(params[1][0]._assignFromOwnResults, false);
  });

  it('gives each document its own `match` when there is a match function', function() {
    const mod = createMod({ ids: [[1, 2], [3, 4]], match: [{ a: 1 }, { a: 2 }] });

    const params = splitPopulateQuery(mod, [1, 2, 3, 4], null, {});

    assert.deepStrictEqual(params[0][0].match, [{ a: 1 }]);
    assert.equal(params[0][1].a, 1);
    assert.deepStrictEqual(params[1][0].match, [{ a: 2 }]);
    assert.equal(params[1][1].a, 2);
  });
});
