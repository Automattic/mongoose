'use strict';

/*!
 * Module dependencies.
 */

var ObjectId = require('../types/objectid');
var utils = require('../utils');

exports.flatten = flatten;
exports.modifiedPaths = modifiedPaths;

/*!
 * ignore
 */

function flatten(update, path, options) {
  var keys = Object.keys(update || {});
  var numKeys = keys.length;
  var result = {};
  path = path ? path + '.' : '';

  for (var i = 0; i < numKeys; ++i) {
    var key = keys[i];
    var val = update[key];
    if (utils.isMongooseObject(val) && !val.$isSingleNested && !Buffer.isBuffer(val)) {
      val = val.toObject({ virtuals: false });
    }
    if (shouldFlatten(val)) {
      result[path + key] = val;
      if (options && options.skipArrays && Array.isArray(val)) {
        continue;
      }
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

/*!
 * ignore
 */

function modifiedPaths(update, path, result) {
  var keys = Object.keys(update || {});
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

/*!
 * ignore
 */

function shouldFlatten(val) {
  return val &&
    typeof val === 'object' &&
    !(val instanceof Date) &&
    !(val instanceof ObjectId) &&
    (!Array.isArray(val) || val.length > 0) &&
    !(val instanceof Buffer);
}
