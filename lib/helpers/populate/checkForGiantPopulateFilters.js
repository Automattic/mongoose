'use strict';

const parentPaths = require('../path/parentPaths');

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

    for (const field of param[0].foreignField) {
      if (Array.isArray(match[field]?.$in)) {
        foreignField = field;
        break;
      }
    }

    if (foreignField != null) {
      const ids = match[foreignField].$in;

      if (ids.length > maxFilterLength) {
        for (let i = 0; i < ids.length; i += maxFilterLength) {
          ret.push(createSplitParam(param, match, foreignField, ids.slice(i, i + maxFilterLength)));
        }
        continue;
      }
    }

    if (Array.isArray(match.$or)) {
      const orBranches = match.$or.map(branch => {
        for (const field of param[0].foreignField) {
          if (Array.isArray(branch[field]?.$in)) {
            return field;
          }
        }
        return null;
      });
      const ids = orBranches.length > 0 && orBranches[0] != null ? match.$or[0][orBranches[0]].$in : null;

      if (ids != null && orBranches.every(field => field != null) && ids.length > maxFilterLength) {
        for (let i = 0; i < ids.length; i += maxFilterLength) {
          ret.push(createSplitParamWithOr(param, match, orBranches, i, i + maxFilterLength));
        }
        continue;
      }
    }

    let elemMatchParentPath = null;
    let elemMatchForeignField = null;

    for (const field of param[0].foreignField) {
      const paths = parentPaths(field);
      for (let i = 0; i < paths.length - 1; ++i) {
        const cur = paths[i];
        const remnant = field.slice(cur.length + 1);
        if (Array.isArray(match[cur]?.$elemMatch?.[remnant]?.$in)) {
          elemMatchParentPath = cur;
          elemMatchForeignField = remnant;
          break;
        }
      }
      if (elemMatchParentPath != null) {
        break;
      }
    }

    if (elemMatchParentPath != null) {
      const ids = match[elemMatchParentPath].$elemMatch[elemMatchForeignField].$in;

      if (ids.length > maxFilterLength) {
        for (let i = 0; i < ids.length; i += maxFilterLength) {
          ret.push(createSplitParamWithElemMatch(
            param,
            match,
            elemMatchParentPath,
            elemMatchForeignField,
            ids.slice(i, i + maxFilterLength)
          ));
        }
        continue;
      }
    }

    ret.push(param);
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

function createSplitParamWithElemMatch(param, match, elemMatchParentPath, elemMatchForeignField, ids) {
  const newParam = param.slice();
  newParam[1] = Object.assign({}, match);
  newParam[1][elemMatchParentPath] = Object.assign({}, match[elemMatchParentPath], {
    $elemMatch: Object.assign({}, match[elemMatchParentPath].$elemMatch, {
      [elemMatchForeignField]: Object.assign({}, match[elemMatchParentPath].$elemMatch[elemMatchForeignField], {
        $in: ids
      })
    })
  });
  return newParam;
}

function createSplitParamWithOr(param, match, orBranches, start, end) {
  const newParam = param.slice();
  newParam[1] = Object.assign({}, match);
  newParam[1].$or = match.$or.map((branch, index) => {
    const foreignField = orBranches[index];
    return Object.assign({}, branch, {
      [foreignField]: Object.assign({}, branch[foreignField], {
        $in: branch[foreignField].$in.slice(start, end)
      })
    });
  });
  return newParam;
}
