'use strict';

/*!
 * ignore
 */

module.exports = function cleanModifiedSubpaths(doc, path, options) {
  options = options || {};
  const skipDocArrays = options.skipDocArrays;

  let deleted = 0;
  if (!doc) {
    return deleted;
  }
  for (const modifiedPath of Object.keys(doc.$__.activePaths.states.modify)) {
    if (skipDocArrays) {
      const schemaType = doc.schema.path(modifiedPath);
      if (schemaType && schemaType.$isMongooseDocumentArray) {
        continue;
      }
    }
    if (modifiedPath.indexOf(path + '.') === 0) {
      delete doc.$__.activePaths.states.modify[modifiedPath];
      ++deleted;
    }
  }
  return deleted;
};
