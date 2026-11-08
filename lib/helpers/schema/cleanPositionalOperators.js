'use strict';

/**
 * For consistency's sake, we replace positional operator `$` and array filters
 * `$[]` and `$[foo]` with `0` when looking up schema paths.
 */

module.exports = function cleanPositionalOperators(path) {
  // Most paths have no positional operators, and a single-char search is much cheaper than running the regexp
  if (path.indexOf('$') === -1) {
    return path;
  }
  return path.replace(/\.\$(\[[^\]]*\])?(?=\.|$)/g, '.0');
};
