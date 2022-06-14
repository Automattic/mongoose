'use strict';

/*!
 * Module dependencies.
 */

const Binary = require('../driver').get().Binary;
const isBsonType = require('./isBsonType');
const isMongooseObject = require('./isMongooseObject');

exports.flatten = flatten;
exports.modifiedPaths = modifiedPaths;

/*!
 * ignore
 */

function flatten(update, path, options, schema) {
  let keys;
  if (update && isMongooseObject(update) && !Buffer.isBuffer(update)) {
    keys = Object.keys(update.toObject({ transform: false, virtuals: false }) || {});
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
    const isNested = schema && schema.nested && schema.nested[path + key];
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

    if (isNested) {
      const paths = Object.keys(schema.paths);
      for (const p of paths) {
        if (p.startsWith(path + key + '.') && !result.hasOwnProperty(p)) {
          result[p] = void 0;
        }
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

    const _path = path + key;
    result[_path] = true;
    if (!Buffer.isBuffer(val) && isMongooseObject(val)) {
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
    !isBsonType(val, 'ObjectID') &&
    (!Array.isArray(val) || val.length !== 0) &&
    !(val instanceof Buffer) &&
    !isBsonType(val, 'Decimal128') &&
    !(val instanceof Binary);
}
