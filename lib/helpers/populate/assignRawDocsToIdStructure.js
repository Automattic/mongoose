'use strict';

module.exports = assignRawDocsToIdStructure;

/*!
 * Assign `vals` returned by mongo query to the `rawIds`
 * structure returned from utils.getVals() honoring
 * query sort order if specified by user.
 *
 * This can be optimized.
 *
 * Rules:
 *
 *   if the value of the path is not an array, use findOne rules, else find.
 *   for findOne the results are assigned directly to doc path (including null results).
 *   for find, if user specified sort order, results are assigned directly
 *   else documents are put back in original order of array if found in results
 *
 * @param {Array} rawIds
 * @param {Array} vals
 * @param {Boolean} sort
 * @api private
 */

function assignRawDocsToIdStructure(rawIds, resultDocs, resultOrder, options, recursed) {
  // honor user specified sort order
  const newOrder = [];
  const sorting = options.sort && rawIds.length > 1;
  let doc;
  let sid;
  let id;

  for (let i = 0; i < rawIds.length; ++i) {
    id = rawIds[i];

    if (Array.isArray(id)) {
      // handle [ [id0, id2], [id3] ]
      assignRawDocsToIdStructure(id, resultDocs, resultOrder, options, true);
      newOrder.push(id);
      continue;
    }

    if (id === null && !sorting) {
      // keep nulls for findOne unless sorting, which always
      // removes them (backward compat)
      newOrder.push(id);
      continue;
    }

    sid = String(id);

    if (recursed) {
      // apply find behavior

      // assign matching documents in original order unless sorting
      doc = resultDocs[sid];
      if (doc) {
        if (sorting) {
          newOrder[resultOrder[sid]] = doc;
        } else {
          newOrder.push(doc);
        }
      } else {
        newOrder.push(id);
      }
    } else {
      // apply findOne behavior - if document in results, assign, else assign null
      newOrder[i] = doc = resultDocs[sid] || null;
    }
  }

  rawIds.length = 0;
  if (newOrder.length) {
    // reassign the documents based on corrected order

    // forEach skips over sparse entries in arrays so we
    // can safely use this to our advantage dealing with sorted
    // result sets too.
    newOrder.forEach(function(doc, i) {
      rawIds[i] = doc;
    });
  }
}