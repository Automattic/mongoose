'use strict';

/*!
 * Module dependencies.
 */

const Mixed = require('../schema/mixed');
const ValidationError = require('../error/validation');
const flatten = require('./common').flatten;
const modifiedPaths = require('./common').modifiedPaths;
const parallel = require('async/parallel');

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
  var _keys;
  var keys = Object.keys(castedDoc || {});
  var updatedKeys = {};
  var updatedValues = {};
  var arrayAtomicUpdates = {};
  var numKeys = keys.length;
  var hasDollarUpdate = false;
  var modified = {};
  var currentUpdate;
  var key;

  for (var i = 0; i < numKeys; ++i) {
    if (keys[i].charAt(0) === '$') {
      hasDollarUpdate = true;
      if (keys[i] === '$push' || keys[i] === '$addToSet') {
        _keys = Object.keys(castedDoc[keys[i]]);
        for (var ii = 0; ii < _keys.length; ++ii) {
          currentUpdate = castedDoc[keys[i]][_keys[ii]];
          if (currentUpdate && currentUpdate.$each) {
            arrayAtomicUpdates[_keys[ii]] = (arrayAtomicUpdates[_keys[ii]] || []).
              concat(currentUpdate.$each);
          } else {
            arrayAtomicUpdates[_keys[ii]] = (arrayAtomicUpdates[_keys[ii]] || []).
              concat([currentUpdate]);
          }
        }
        continue;
      }
      modifiedPaths(castedDoc[keys[i]], '', modified);
      var flat = flatten(castedDoc[keys[i]]);
      var paths = Object.keys(flat);
      var numPaths = paths.length;
      for (var j = 0; j < numPaths; ++j) {
        var updatedPath = paths[j].replace('.$.', '.0.');
        updatedPath = updatedPath.replace(/\.\$$/, '.0');
        key = keys[i];
        // With `$pull` we might flatten `$in`. Skip stuff nested under `$in`
        // for the rest of the logic, it will get handled later.
        if (updatedPath.indexOf('$') !== -1) {
          continue;
        }
        if (key === '$set' || key === '$setOnInsert' ||
            key === '$pull' || key === '$pullAll') {
          updatedValues[updatedPath] = flat[paths[j]];
        } else if (key === '$unset') {
          updatedValues[updatedPath] = undefined;
        }
        updatedKeys[updatedPath] = true;
      }
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
  function iter(i, v) {
    var schemaPath = schema._getSchema(updates[i]);
    if (schemaPath) {
      // gh-4305: `_getSchema()` will report all sub-fields of a 'Mixed' path
      // as 'Mixed', so avoid double validating them.
      if (schemaPath instanceof Mixed && schemaPath.$fullPath !== updates[i]) {
        return;
      }

      if (v && Array.isArray(v.$in)) {
        v.$in.forEach((v, i) => {
          validatorsToExecute.push(function(callback) {
            schemaPath.doValidate(
              v,
              function(err) {
                if (err) {
                  err.path = updates[i] + '.$in.' + i;
                  validationErrors.push(err);
                }
                callback(null);
              },
              options && options.context === 'query' ? query : null,
              {updateValidator: true});
          });
        });
      } else {
        validatorsToExecute.push(function(callback) {
          schemaPath.doValidate(
            v,
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
  }
  for (i = 0; i < numUpdates; ++i) {
    iter(i, updatedValues[updates[i]]);
  }

  var arrayUpdates = Object.keys(arrayAtomicUpdates);
  var numArrayUpdates = arrayUpdates.length;
  for (i = 0; i < numArrayUpdates; ++i) {
    (function(i) {
      var schemaPath = schema._getSchema(arrayUpdates[i]);
      if (schemaPath && schemaPath.$isMongooseDocumentArray) {
        validatorsToExecute.push(function(callback) {
          schemaPath.doValidate(
            arrayAtomicUpdates[arrayUpdates[i]],
            function(err) {
              if (err) {
                err.path = arrayUpdates[i];
                validationErrors.push(err);
              }
              callback(null);
            },
            options && options.context === 'query' ? query : null);
        });
      } else {
        schemaPath = schema._getSchema(arrayUpdates[i] + '.0');
        for (var j = 0; j < arrayAtomicUpdates[arrayUpdates[i]].length; ++j) {
          (function(j) {
            validatorsToExecute.push(function(callback) {
              schemaPath.doValidate(
                arrayAtomicUpdates[arrayUpdates[i]][j],
                function(err) {
                  if (err) {
                    err.path = arrayUpdates[i];
                    validationErrors.push(err);
                  }
                  callback(null);
                },
                options && options.context === 'query' ? query : null,
                { updateValidator: true });
            });
          })(j);
        }
      }
    })(i);
  }

  return function(callback) {
    parallel(validatorsToExecute, function() {
      if (validationErrors.length) {
        var err = new ValidationError(null);
        for (var i = 0; i < validationErrors.length; ++i) {
          err.addError(validationErrors[i].path, validationErrors[i]);
        }
        return callback(err);
      }
      callback(null);
    });
  };
};
