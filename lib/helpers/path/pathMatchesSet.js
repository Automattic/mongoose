'use strict';

const ancestorPathsCache = new WeakMap();

function getAncestorPaths(pathSet) {
  let ancestorPaths = ancestorPathsCache.get(pathSet);
  if (ancestorPaths != null) {
    return ancestorPaths;
  }

  ancestorPaths = new Set();
  for (const path of pathSet) {
    let dotIndex = path.indexOf('.');
    while (dotIndex !== -1) {
      ancestorPaths.add(path.slice(0, dotIndex));
      dotIndex = path.indexOf('.', dotIndex + 1);
    }
  }

  ancestorPathsCache.set(pathSet, ancestorPaths);
  return ancestorPaths;
}

/**
 * Returns true if `path` matches against `pathSet` for optimisticConcurrency checking.
 *
 * Always checks:
 *   - Exact match:    'profile.firstName' matches Set{ 'profile.firstName' }
 *   - Ancestor match: 'profile.firstName' matches if 'profile' is in pathSet
 *
 * When `checkDescendants` is true (include list), also checks:
 *   - Descendant match: 'profile.address' matches if 'profile.address.country' is in pathSet
 *
 * @param {string} path - directly modified path to check
 * @param {Set<string>} pathSet
 * @param {boolean} [checkDescendants=false] - enable descendant direction (for include lists)
 * @returns {boolean}
 */
module.exports = function pathMatchesSet(path, pathSet, checkDescendants) {
  // Exact match
  if (pathSet.has(path)) return true;

  // Ancestor match
  let dotIndex = path.indexOf('.');
  while (dotIndex !== -1) {
    if (pathSet.has(path.slice(0, dotIndex))) return true;
    dotIndex = path.indexOf('.', dotIndex + 1);
  }

  // Descendant match (include case only)
  if (checkDescendants && getAncestorPaths(pathSet).has(path)) {
    return true;
  }

  return false;
};
