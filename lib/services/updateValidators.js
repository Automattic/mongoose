/*!
 * Module dependencies.
 */

var async = require('async');
var ValidationError = require('../error/validation.js');
var ObjectId = require('../types/objectid');

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
  var keys = Object.keys(castedDoc || {});
  var updatedKeys = {};
  var updatedValues = {};
  var numKeys = keys.length;
  var hasDollarUpdate = false;
  var modified = {};

  for (var i = 0; i < numKeys; ++i) {
    if (keys[i].charAt(0) === '$') {
      modifiedPaths(castedDoc[keys[i]], '', modified);
      var flat = flatten(castedDoc[keys[i]]);
      var paths = Object.keys(flat);
      var numPaths = paths.length;
      for (var j = 0; j < numPaths; ++j) {
        var updatedPath = paths[j].replace('.$.', '.0.');
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
      var condition = query._conditions[path];
      if (condition && typeof condition === 'object') {
        var conditionKeys = Object.keys(condition);
        var numConditionKeys = conditionKeys.length;
        var hasDollarKey = false;
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

            var def = _schemaType.getDefault(null, true);
            if (!modified[path + '.' + _path] && typeof def !== 'undefined') {
              castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
              castedDoc.$setOnInsert[path + '.' + _path] = def;
              updatedValues[path + '.' + _path] = def;
            }
          });
        } else {
          var def = schemaType.getDefault(null, true);
          if (!modified[path] && typeof def !== 'undefined') {
            castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
            castedDoc.$setOnInsert[path] = def;
            updatedValues[path] = def;
          }
        }
      });
    }
  }

  var updates = Object.keys(updatedValues);
  var numUpdates = updates.length;
  var validatorsToExecute = [];
  var validationErrors = [];
  for (i = 0; i < numUpdates; ++i) {
    (function(i) {
      var schemaPath = schema._getSchema(updates[i]);
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
            { updateValidator: true });
        });
      }
    })(i);
  }

  return function(callback) {
    async.parallel(validatorsToExecute, function() {
      if (validationErrors.length) {
        var err = new ValidationError(null);
        for (var i = 0; i < validationErrors.length; ++i) {
          err.errors[validationErrors[i].path] = validationErrors[i];
        }
        return callback(err);
      }
      callback(null);
    });
  };
};

function modifiedPaths(update, path, result) {
  var keys = Object.keys(update);
  var numKeys = keys.length;
  result = result || {};
  path = path ? path + '.' : '';

  for (var i = 0; i < numKeys; ++i) {
    var key = keys[i];
    var val = update[key];

    result[path + key] = true;
    if (shouldFlatten(val)) {
      modifiedPaths(val, path + key, result);
    }
  }

  return result;
}

function flatten(update, path) {
  var keys = Object.keys(update);
  var numKeys = keys.length;
  var result = {};
  path = path ? path + '.' : '';

  for (var i = 0; i < numKeys; ++i) {
    var key = keys[i];
    var val = update[key];
    if (shouldFlatten(val)) {
      var flat = flatten(val, path + key);
      for (var k in flat) {
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
