'use strict';

/*!
 * Module dependencies.
 */

const Decimal128 = require('../types/decimal128');
const ObjectId = require('../types/objectid');
const utils = require('../utils');

exports.flatten = flatten;
exports.modifiedPaths = modifiedPaths;

/*!
 * ignore
 */

function flatten(update, path, options, schema) {
  let keys;
  if (update && utils.isMongooseObject(update) && !Buffer.isBuffer(update)) {
    keys = Object.keys(update.toObject({ transform: false, virtuals: false }));
  } else {
    keys = Object.keys(update || {});
  }

  const numKeys = keys.length;
  const result = {};
  path = path ? path + '.' : '';

  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    const val = update[key];
    result[path + key] = val;

    // Avoid going into mixed paths if schema is specified
    const keySchema = schema && schema.path && schema.path(path + key);
    if (keySchema && keySchema.instance === 'Mixed') continue;

    if (shouldFlatten(val)) {
      if (options && options.skipArrays && Array.isArray(val)) {
        continue;
      }
      const flat = flatten(val, path + key, options, schema);
      for (const k in flat) {
        result[k] = flat[k];
      }
      if (Array.isArray(val)) {
        result[path + key] = val;
      }
    }
  }

  return result;
}

/*!
 * ignore
 */

function modifiedPaths(update, path, result) {
  const keys = Object.keys(update || {});
  const numKeys = keys.length;
  result = result || {};
  path = path ? path + '.' : '';

  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    let val = update[key];

    result[path + key] = true;
    if (utils.isMongooseObject(val) && !Buffer.isBuffer(val)) {
      val = val.toObject({ transform: false, virtuals: false });
    }
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
    !(val instanceof Buffer) &&
    !(val instanceof Decimal128);
}
