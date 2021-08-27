'use strict';

/*!
 * Determines if `path2` is a subpath of or equal to `path1`
 *
 * @param {string} path1
 * @param {string} path2
 * @return {Boolean}
 */

module.exports = function isSubpath(path1, path2) {
  const path1Parts = path1.split('.');
  const path2Parts = path2.split('.');
  for (let i = 0; i < Math.min(path1Parts.length, path2Parts.length); ++i) {
    // If any path parts don't match, then path1 is not a subpath of path2
    if (path1Parts[i] !== path2Parts[i]) {
      return false;
    }
  }
  // If all corresponding parts match, but path1 has more parts than path2, then path1 is not a subpath of path2
  // e.g. "a.b" is not a subpath of "a.b.c"
  return path1Parts.length <= path2Parts.length;
};
