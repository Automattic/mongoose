'use strict';

const createPopulateQueryFilter = require('./createPopulateQueryFilter');
const get = require('../get');
const utils = require('../../utils');

module.exports = splitPopulateQuery;

/*!
 * If a single populate query would have more than this many elements in its `$in` filter,
 * Mongoose splits the populate into a separate query per document to avoid going over
 * MongoDB's 16 MB BSON size limit on queries. Overwritable for testing purposes. See gh-5890.
 */

splitPopulateQuery.maxInFilterLength = 50000;

/*!
 * Split a populate models-map entry into a separate query per document if either:
 *
 * 1. The `perDocumentLimit` option is set, so each document needs its own query with its
 *    own `limit` (gh-7318), or
 * 2. A single populate query for `mod` would have too many elements in its `$in` filter
 *    (gh-5890). With multiple foreign fields, `createPopulateQueryFilter()` repeats the ids
 *    under `$or` once per foreign field, so the threshold counts one copy of `ids` per
 *    foreign field.
 *
 * Returns a list of `[mod, match, select, assignmentOpts]` params, one per document, for
 * `_execPopulateQuery()`. Returns `null` if the populate query doesn't need to be split.
 * A `null` `match` means the document has no ids to query: `_execPopulateQuery()` skips
 * executing a query, and `_assign()` just sets the document's populated path to the
 * default value.
 *
 * Splitting on document boundaries means each document's populated value is the result of
 * exactly one query, so split entries can typically be assigned from only their own query's
 * results (`_assignFromOwnResults`) rather than scanning every populate query's results.
 * refPath is the exception: a single document's array can contain ids for multiple models,
 * so assigning refPath populate results relies on every query's results being available for
 * every document. refPath entries are therefore only split when `perDocumentLimit` requires
 * it, not to keep the `$in` filter small. A single document whose ids alone overflow the
 * BSON size limit cannot be split.
 */

function splitPopulateQuery(mod, ids, select, assignmentOpts) {
  if (mod.docs.length <= 1) {
    return null;
  }
  const perDocumentLimit = mod.options.perDocumentLimit == null ?
    get(mod.options, 'options.perDocumentLimit', null) :
    mod.options.perDocumentLimit;
  const numInFilterElements = ids.length * mod.foreignField.size;
  if (perDocumentLimit == null && (numInFilterElements <= splitPopulateQuery.maxInFilterLength || mod.isRefPath)) {
    return null;
  }

  return mod.docs.map((doc, i) => {
    const subMod = {
      ...mod,
      docs: [doc],
      ids: [mod.ids[i]],
      allIds: [mod.allIds[i]],
      unpopulatedValues: [mod.unpopulatedValues[i]],
      match: Array.isArray(mod.match) ? [mod.match[i]] : mod.match,
      _assignFromOwnResults: !mod.isRefPath
    };
    let subIds = utils.array.flatten(subMod.ids, flatten);
    subIds = utils.array.unique(subIds);
    const match = subIds.length === 0 || subIds.every(utils.isNullOrUndefined) ?
      null :
      createPopulateQueryFilter(subIds, subMod.match, subMod.foreignField, subMod.model, subMod.options.skipInvalidIds);
    return [subMod, match, select, assignmentOpts];
  });
}

/*!
 * ignore
 */

function flatten(item) {
  // no need to include undefined values in our query
  return undefined !== item;
}
