/*!
 * Module dependencies.
 */

var async = require('async');
var ValidationError = require('../error/validation.js');

/**
 * Applies validators and defaults to update and fineOneAndUpdate operations,
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
  for (var i = 0; i < numKeys; ++i) {
    if (keys[i].charAt(0) === '$') {
      var paths = Object.keys(castedDoc[keys[i]]);
      var numPaths = paths.length;
      for (var j = 0; j < numPaths; ++j) {
        if (keys[i] === '$set' || keys[i] === '$setOnInsert') {
          updatedValues[paths[j]] = castedDoc[keys[i]][paths[j]];
        } else if (keys[i] === '$unset') {
          updatedValues[paths[j]] = undefined;
        }
        updatedKeys[paths[j]] = true;
      }
    } else {
      updatedValues[keys[i]] = castedDoc[keys[i]];
      updatedKeys[keys[i]] = true;
    }
  }

  if (options && options.upsert) {
    paths = Object.keys(query._conditions);
    numPaths = keys.length;
    for (var i = 0; i < numPaths; ++i) {
      if (typeof query._conditions[paths[i]] === 'Object') {
        var conditionKeys = Object.keys(query._conditions[paths[i]]);
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
      updatedKeys[paths[i]] = true;
    }

    if (options.setDefaultsOnInsert) {
      schema.eachPath(function(path, schemaType) {
        if (path === '_id') {
          // Ignore _id for now because it causes bugs in 2.4
          return;
        }
        var def = schemaType.getDefault(null, true);
        if (!updatedKeys[path] && typeof def !== 'undefined') {
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
      validatorsToExecute.push(function(callback) {
        schema.path(updates[i]).doValidate(
          updatedValues[updates[i]],
          function(err) {
            if (err) {
              validationErrors.push(err);
            }
            process.nextTick(function() {
              callback(null);
            });
          },
          null);
      });
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
