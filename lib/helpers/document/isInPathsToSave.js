'use strict';

/**
 * Returns true if `path` is included by the `pathsToSave` filter.
 * Matches exact paths and child paths (e.g. 'metadata.views' is included by 'metadata').
 *
 * @param {string} path
 * @param {Set<string>} pathsToSaveSet - pre-built Set of pathsToSave for O(1) exact lookup
 * @param {string[]} pathsToSave - original array, used for prefix matching
 * @returns {boolean}
 */
module.exports = function isInPathsToSave(path, pathsToSaveSet, pathsToSave) {
  if (pathsToSaveSet.has(path)) {
    return true;
  }

  for (const pathToSave of pathsToSave) {
    if (path.slice(0, pathToSave.length) === pathToSave && path.charAt(pathToSave.length) === '.') {
      return true;
    }
  }

  return false;
};
