/*!
 * Module dependencies.
 */

const async = require('async');
const ValidationError = require('../error/validation.js');
const ObjectId = require('../types/objectid');

/**
 * Applies validators and defaults to update and findOneAndUpdate operations,
 * specifically passing a null doc as `this` to validators and defaults
 *
 * @param {Query} query
 * @param {Schema} schema
 * @param {Object} castedDoc
 * @param {Object} options
 * @method runValidatorsOnUpdate
 * @api private
 */

module.exports = function(query, schema, castedDoc, options) {
  const keys = Object.keys(castedDoc || {});
  let updatedKeys = {};
  let updatedValues = {};
  const numKeys = keys.length;
  let hasDollarUpdate = false;
  const modified = {};

  for (var i = 0; i < numKeys; ++i) {
    if (keys[i].charAt(0) === '$') {
      modifiedPaths(castedDoc[keys[i]], '', modified);
      const flat = flatten(castedDoc[keys[i]]);
      var paths = Object.keys(flat);
      var numPaths = paths.length;
      for (var j = 0; j < numPaths; ++j) {
        let updatedPath = paths[j].replace('.$.', '.0.');
        updatedPath = updatedPath.replace(/\.\$$/, '.0');
        if (keys[i] === '$set' || keys[i] === '$setOnInsert') {
          updatedValues[updatedPath] = flat[paths[j]];
        } else if (keys[i] === '$unset') {
          updatedValues[updatedPath] = undefined;
        }
        updatedKeys[updatedPath] = true;
      }
      hasDollarUpdate = true;
    }
  }

  if (!hasDollarUpdate) {
    modifiedPaths(castedDoc, '', modified);
    updatedValues = flatten(castedDoc);
    updatedKeys = Object.keys(updatedValues);
  }

  if (options && options.upsert) {
    paths = Object.keys(query._conditions);
    numPaths = keys.length;
    for (i = 0; i < numPaths; ++i) {
      var path = paths[i];
      const condition = query._conditions[path];
      if (condition && typeof condition === 'object') {
        const conditionKeys = Object.keys(condition);
        const numConditionKeys = conditionKeys.length;
        let hasDollarKey = false;
        for (j = 0; j < numConditionKeys; ++j) {
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
      modified[path] = true;
    }

    if (options.setDefaultsOnInsert) {
      schema.eachPath(function(path, schemaType) {
        if (path === '_id') {
          // Ignore _id for now because it causes bugs in 2.4
          return;
        }
        if (schemaType.$isSingleNested) {
          // Only handle nested schemas 1-level deep to avoid infinite
          // recursion re: https://github.com/mongodb-js/mongoose-autopopulate/issues/11
          schemaType.schema.eachPath(function(_path, _schemaType) {
            if (path === '_id') {
              // Ignore _id for now because it causes bugs in 2.4
              return;
            }

            const def = _schemaType.getDefault(null, true);
            if (!modified[path + '.' + _path] && typeof def !== 'undefined') {
              castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
              castedDoc.$setOnInsert[path + '.' + _path] = def;
              updatedValues[path + '.' + _path] = def;
            }
          });
        } else {
          const def = schemaType.getDefault(null, true);
          if (!modified[path] && typeof def !== 'undefined') {
            castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
            castedDoc.$setOnInsert[path] = def;
            updatedValues[path] = def;
          }
        }
      });
    }
  }

  const updates = Object.keys(updatedValues);
  const numUpdates = updates.length;
  const validatorsToExecute = [];
  const validationErrors = [];
  function iter(i) {
    const schemaPath = schema._getSchema(updates[i]);
    if (schemaPath) {
      validatorsToExecute.push(function(callback) {
        schemaPath.doValidate(
            updatedValues[updates[i]],
            function(err) {
              if (err) {
                err.path = updates[i];
                validationErrors.push(err);
              }
              callback(null);
            },
            options && options.context === 'query' ? query : null,
            {updateValidator: true});
      });
    }
  }
  for (i = 0; i < numUpdates; ++i) {
    iter(i);
  }

  return function(callback) {
    async.parallel(validatorsToExecute, function() {
      if (validationErrors.length) {
        const err = new ValidationError(null);
        for (let i = 0; i < validationErrors.length; ++i) {
          err.errors[validationErrors[i].path] = validationErrors[i];
        }
        return callback(err);
      }
      callback(null);
    });
  };
};

function modifiedPaths(update, path, result) {
  const keys = Object.keys(update);
  const numKeys = keys.length;
  result = result || {};
  path = path ? path + '.' : '';

  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    const val = update[key];

    result[path + key] = true;
    if (shouldFlatten(val)) {
      modifiedPaths(val, path + key, result);
    }
  }

  return result;
}

function flatten(update, path) {
  const keys = Object.keys(update);
  const numKeys = keys.length;
  const result = {};
  path = path ? path + '.' : '';

  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    const val = update[key];
    if (shouldFlatten(val)) {
      const flat = flatten(val, path + key);
      for (let k in flat) {
        result[k] = flat[k];
      }
      if (Array.isArray(val)) {
        result[path + key] = val;
      }
    } else {
      result[path + key] = val;
    }
  }

  return result;
}

function shouldFlatten(val) {
  return val &&
    typeof val === 'object' &&
    !(val instanceof Date) &&
    !(val instanceof ObjectId) &&
    (!Array.isArray(val) || val.length > 0) &&
    !(val instanceof Buffer);
}
