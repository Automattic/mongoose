'use strict';

const _modifiedPaths = require('../common').modifiedPaths;

/**
 * Given an update document with potential update operators (`$set`, etc.)
 * returns an object whose keys are the directly modified paths
 *
 * @param {Object} update
 * @return {Object} modified
 */

module.exports = function modifiedPaths(update) {
  const keys = Object.keys(update);
  const hasDollarKey = keys.filter(key => key.startsWith('$')).length > 0;

  const res = {};
  if (hasDollarKey) {
    for (const key of keys) {
      _modifiedPaths(update[key], '', res);
    }
  } else {
    _modifiedPaths(update, '', res);
  }

  return res;
};
