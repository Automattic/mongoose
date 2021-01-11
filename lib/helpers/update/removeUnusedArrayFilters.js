'use strict';

/**
 * MongoDB throws an error if there's unused array filters. That is, if `options.arrayFilters` defines
 * a filter, but none of the `update` keys use it. This should be enough to filter out all unused array
 * filters.
 */

module.exports = function removeUnusedArrayFilters(update, arrayFilters) {
  const updateKeys = Object.keys(update).map(key => Object.keys(update[key])).reduce((cur, arr) => cur.concat(arr), []);
  return arrayFilters.filter(obj => {
    const firstKey = Object.keys(obj)[0];
    const firstDot = firstKey.indexOf('.');
    const arrayFilterKey = firstDot === -1 ? firstKey : firstKey.slice(0, firstDot);

    return updateKeys.find(key => key.includes('$[' + arrayFilterKey + ']')) != null;
  });
};