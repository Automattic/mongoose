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

  for (const modifiedPath of Object.keys(doc.$__.activePaths.getStatePaths('modify'))) {
    if (skipDocArrays) {
      const schemaType = doc.$__schema.path(modifiedPath);
      if (schemaType && schemaType.$isMongooseDocumentArray) {
        continue;
      }
    }
    if (modifiedPath.startsWith(path + '.')) {
      doc.$__.activePaths.clearPath(modifiedPath);
      ++deleted;

      if (doc.$isSubdocument) {
        cleanParent(doc, modifiedPath);
      }
    }
  }
  return deleted;
};

function cleanParent(doc, path, seen = new Set()) {
  if (seen.has(doc)) {
    throw new Error('Infinite subdocument loop: subdoc with _id ' + doc._id + ' is a parent of itself');
  }
  const parent = doc.$parent();
  const newPath = doc.$__pathRelativeToParent(void 0, false) + '.' + path;
  parent.$__.activePaths.clearPath(newPath);
  if (parent.$isSubdocument) {
    cleanParent(parent, newPath, seen);
  }
}
