'use strict';
const get = require('./get');

/**
 * Applies defaults to update and findOneAndUpdate operations.
 *
 * @param {Object} filter
 * @param {Schema} schema
 * @param {Object} castedDoc
 * @param {Object} options
 * @method setDefaultsOnInsert
 * @api private
 */

module.exports = function(filter, schema, castedDoc, options) {
  options = options || {};

  const shouldSetDefaultsOnInsert = options.setDefaultsOnInsert ?? schema.base.options.setDefaultsOnInsert;

  if (!options.upsert || shouldSetDefaultsOnInsert === false) {
    return castedDoc;
  }

  const keys = Object.keys(castedDoc || {});
  const updatedKeys = {};
  const updatedValues = {};
  const numKeys = keys.length;

  let hasDollarUpdate = false;

  for (let i = 0; i < numKeys; ++i) {
    if (keys[i].charAt(0) === '$') {
      hasDollarUpdate = true;
      break;
    }
  }

  const paths = Object.keys(filter);
  const numPaths = paths.length;
  for (let i = 0; i < numPaths; ++i) {
    const path = paths[i];
    const condition = filter[path];
    if (condition && typeof condition === 'object') {
      const conditionKeys = Object.keys(condition);
      const numConditionKeys = conditionKeys.length;
      let hasDollarKey = false;
      for (let j = 0; j < numConditionKeys; ++j) {
        if (conditionKeys[j].charAt(0) === '$') {
          hasDollarKey = true;
          break;
        }
      }
      if (hasDollarKey) {
        continue;
      }
    }
    updatedKeys[path] = true;
  }

  if (options?.overwrite && !hasDollarUpdate) {
    // Defaults will be set later, since we're overwriting we'll cast
    // the whole update to a document
    return castedDoc;
  }

  schema.eachPath(function(path, schemaType) {
    // Skip single nested paths if underneath a map
    if (schemaType.path === '_id' && schemaType.options.auto) {
      return;
    }
    const def = schemaType.getDefault(null, true);
    if (typeof def === 'undefined') {
      return;
    }
    const pathPieces = schemaType.splitPath();
    if (pathPieces.includes('$*')) {
      // Skip defaults underneath maps. We should never do `$setOnInsert` on a path with `$*`
      return;
    }
    if (isModified(castedDoc, updatedKeys, path, pathPieces, hasDollarUpdate)) {
      return;
    }

    castedDoc = castedDoc || {};
    castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
    if (get(castedDoc, path) == null) {
      castedDoc.$setOnInsert[path] = def;
    }
    updatedValues[path] = def;
  });

  return castedDoc;
};

function isModified(castedDoc, updatedKeys, path, pathPieces, hasDollarUpdate) {
  // Check if path is in filter (updatedKeys)
  if (updatedKeys[path]) {
    return true;
  }

  // Check if any parent path is in filter
  let cur = pathPieces[0];
  for (let i = 1; i < pathPieces.length; ++i) {
    if (updatedKeys[cur]) {
      return true;
    }
    cur += '.' + pathPieces[i];
  }

  // Check if path is modified in the update
  if (hasDollarUpdate) {
    // Check each update operator
    for (const key in castedDoc) {
      if (key.charAt(0) === '$') {
        if (pathExistsInUpdate(castedDoc[key], path, pathPieces)) {
          return true;
        }
      }
    }
  } else {
    // No dollar operators, check the castedDoc directly
    if (pathExistsInUpdate(castedDoc, path, pathPieces)) {
      return true;
    }
  }

  return false;
}

function pathExistsInUpdate(update, targetPath, pathPieces) {
  if (update == null || typeof update !== 'object') {
    return false;
  }

  // Check exact match
  if (Object.hasOwn(update, targetPath)) {
    return true;
  }

  // Check if any parent path exists
  let cur = pathPieces[0];
  for (let i = 1; i < pathPieces.length; ++i) {
    if (Object.hasOwn(update, cur)) {
      return true;
    }
    cur += '.' + pathPieces[i];
  }

  // Check if any child path exists (e.g., path is "a" and update has "a.b")
  const prefix = targetPath + '.';
  for (const key in update) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
