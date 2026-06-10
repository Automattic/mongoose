'use strict';

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

// Max 50k $in elements - 800k ObjectIds or so can fit into the 16MB document size limit.
// Keep a lower limit to reduce risk of running into BSON size limits. Not foolproof: if
// ids are long strings or buffers then this may still be over 16MB. But the performance
// overhead of calculating the size of a large array is massive relative to simply checking
// the array length.
module.exports.maxFilterLength = 50000;

function createSplitParam(param, match, foreignField, ids) {
  const newParam = param.slice();
  newParam[1] = Object.assign({}, match);
  newParam[1][foreignField] = Object.assign({}, match[foreignField], {
    $in: ids
  });
  return newParam;
}
