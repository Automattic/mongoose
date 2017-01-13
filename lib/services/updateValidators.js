/*!
 * Module dependencies.
 */

var Mixed = require('../schema/mixed');
var ValidationError = require('../error/validation');
var parallel = require('async/parallel');
var flatten = require('./common').flatten;
var modifiedPaths = require('./common').modifiedPaths;

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

  var updates = Object.keys(updatedValues);
  var numUpdates = updates.length;
  var validatorsToExecute = [];
  var validationErrors = [];
  function iter(i) {
    var schemaPath = schema._getSchema(updates[i]);
    if (schemaPath) {
      // gh-4305: `_getSchema()` will report all sub-fields of a 'Mixed' path
      // as 'Mixed', so avoid double validating them.
      if (schemaPath instanceof Mixed && schemaPath.$fullPath !== updates[i]) {
        return;
      }
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
    parallel(validatorsToExecute, function() {
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
