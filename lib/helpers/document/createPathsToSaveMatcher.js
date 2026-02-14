'use strict';

module.exports = function createPathsToSaveMatcher(pathsToSave) {
  if (!Array.isArray(pathsToSave)) {
    return null;
  }

  const exactPaths = new Set(pathsToSave);

  return function isPathIncluded(path) {
    if (exactPaths.has(path)) {
      return true;
    }

    for (const pathToSave of pathsToSave) {
      if (path.startsWith(pathToSave + '.')) {
        return true;
      }
    }

    return false;
  };
};
