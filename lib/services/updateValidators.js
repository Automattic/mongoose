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
        if (keys[i] === '$set' || keys[i] === '$setOnInsert') {
          updatedValues[paths[j]] = flat[paths[j]];
        } else if (keys[i] === '$unset') {
          updatedValues[paths[j]] = undefined;
        }
        updatedKeys[paths[j]] = true;
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
    for (var i = 0; i < numPaths; ++i) {
      var path = paths[i];
      var condition = query._conditions[path];
      if (condition && typeof condition === 'object') {
        var conditionKeys = Object.keys(condition);
        var numConditionKeys = conditionKeys.length;
        var hasDollarKey = false;
        for (var j = 0; j < numConditionKeys; ++j) {
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
        var def = schemaType.getDefault(null, true);
        if (!modified[path] && typeof def !== 'undefined') {
          castedDoc.$setOnInsert = castedDoc.$setOnInsert || {};
          castedDoc.$setOnInsert[path] = def;
          updatedValues[path] = def;
        }
      });
    }
  }

  var updates = Object.keys(updatedValues);
  var numUpdates = updates.length;
  var validatorsToExecute = [];
  var validationErrors = [];
  for (var i = 0; i < numUpdates; ++i) {
    (function(i) {
      if (schema.path(updates[i])) {
        validatorsToExecute.push(function(callback) {
          schema.path(updates[i]).doValidate(
            updatedValues[updates[i]],
            function(err) {
              if (err) {
                validationErrors.push(err);
              }
              callback(null);
            },
            null);
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
    !(val instanceof ObjectId);
}
