'use strict';

/*!
 * ignore
 */

module.exports = function cleanModifiedSubpaths(doc, path) {
  var _modifiedPaths = Object.keys(doc.$__.activePaths.states.modify);
  var _numModifiedPaths = _modifiedPaths.length;
  var deleted = 0;
  for (var j = 0; j < _numModifiedPaths; ++j) {
    if (_modifiedPaths[j].indexOf(path + '.') === 0) {
      delete doc.$__.activePaths.states.modify[_modifiedPaths[j]];
      ++deleted;
    }
  }
  return deleted;
};
