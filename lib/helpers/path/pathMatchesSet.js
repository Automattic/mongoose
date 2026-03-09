'use strict';

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
  const parts = path.split('.');
  for (let i = 1; i < parts.length; i++) {
    if (pathSet.has(parts.slice(0, i).join('.'))) return true;
  }

  // Descendant match (include case only)
  if (checkDescendants) {
    const prefix = path + '.';
    for (const p of pathSet) {
      if (p.startsWith(prefix)) return true;
    }
  }

  return false;
};
