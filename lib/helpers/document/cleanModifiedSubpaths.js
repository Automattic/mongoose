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
      const schemaType = doc.$__schema.path(modifiedPath);
      if (schemaType && schemaType.$isMongooseDocumentArray) {
        continue;
      }
    }
    if (modifiedPath.startsWith(path + '.')) {
      delete doc.$__.activePaths.states.modify[modifiedPath];
      ++deleted;

      if (doc.$isSubdocument) {
        const owner = doc.ownerDocument();
        const fullPath = doc.$__fullPath(modifiedPath);
        delete owner.$__.activePaths.states.modify[fullPath];
      }
    }
  }
  return deleted;
};
