'use strict';

/**
 * Split populate query params that have an oversized `$in` filter on the
 * populated foreign field. Prevents Mongoose from creating a single enormous
 * populate query with hundreds of thousands of ids.
 *
 * @param {Array} params array of populate query params: [mod, match, select, assignmentOpts]
 * @returns {Array} original params plus any split params needed for large `$in` filters
 * @api private
 */

module.exports = function checkForGiantPopulateFilters(params) {
  const maxFilterLength = module.exports.maxFilterLength;
  if (typeof maxFilterLength !== 'number' || maxFilterLength <= 0) {
    return params;
  }

  const ret = [];
  for (const param of params) {
    const match = param[1];
    let foreignField = null;
    let ids = null;

    for (const field of param[0].foreignField) {
      if (Array.isArray(match[field]?.$in)) {
        foreignField = field;
        ids = match[field].$in;
        break;
      }
    }

    if (!Array.isArray(ids) || ids.length <= maxFilterLength) {
      ret.push(param);
      continue;
    }

    for (let i = 0; i < ids.length; i += maxFilterLength) {
      ret.push(createSplitParam(param, match, foreignField, ids.slice(i, i + maxFilterLength)));
    }
  }

  return ret;
};

/**
 * Max 50k `$in` elements. About 800k ObjectIds can fit into the 16MB document
 * size limit, so this lower limit reduces the risk of running into BSON size
 * limits. Not foolproof: long strings or buffers may still exceed 16MB. But
 * benchmarks/populateFilterSize.js showed the performance overhead of
 * calculating byte size for large arrays is massive relative to checking length.
 *
 * @property maxFilterLength
 * @memberOf checkForGiantPopulateFilters
 * @api private
 */

module.exports.maxFilterLength = 50000;

function createSplitParam(param, match, foreignField, ids) {
  const newParam = param.slice();
  newParam[1] = Object.assign({}, match);
  newParam[1][foreignField] = Object.assign({}, match[foreignField], {
    $in: ids
  });
  return newParam;
}
