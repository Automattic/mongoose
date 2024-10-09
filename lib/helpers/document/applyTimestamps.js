'use strict';

const handleTimestampOption = require('../schema/handleTimestampOption');
const mpath = require('mpath');

module.exports = applyTimestamps;

/**
 * Apply a given schema's timestamps to the given POJO
 *
 * @param {Schema} schema
 * @param {Object} obj
 * @param {Object} [options]
 * @param {Boolean} [options.isUpdate=false] if true, treat this as an update: just set updatedAt, skip setting createdAt. If false, set both createdAt and updatedAt
 * @param {Function} [options.currentTime] if set, Mongoose will call this function to get the current time.
 */

function applyTimestamps(schema, obj, options) {
  if (obj == null) {
    return obj;
  }

  applyTimestampsToChildren(schema, obj, options);
  return applyTimestampsToDoc(schema, obj, options);
}

/**
 * Apply timestamps to any subdocuments
 *
 * @param {Schema} schema subdocument schema
 * @param {Object} res subdocument
 * @param {Object} [options]
 * @param {Boolean} [options.isUpdate=false] if true, treat this as an update: just set updatedAt, skip setting createdAt. If false, set both createdAt and updatedAt
 * @param {Function} [options.currentTime] if set, Mongoose will call this function to get the current time.
 */

function applyTimestampsToChildren(schema, res, options) {
  for (const childSchema of schema.childSchemas) {
    const _path = childSchema.model.path;
    const _schema = childSchema.schema;
    if (!_path) {
      continue;
    }
    const _obj = mpath.get(_path, res);
    if (_obj == null || (Array.isArray(_obj) && _obj.flat(Infinity).length === 0)) {
      continue;
    }

    applyTimestamps(_schema, _obj, options);
  }
}

/**
 * Apply timestamps to a given document. Does not apply timestamps to subdocuments: use `applyTimestampsToChildren` instead
 *
 * @param {Schema} schema
 * @param {Object} obj
 * @param {Object} [options]
 * @param {Boolean} [options.isUpdate=false] if true, treat this as an update: just set updatedAt, skip setting createdAt. If false, set both createdAt and updatedAt
 * @param {Function} [options.currentTime] if set, Mongoose will call this function to get the current time.
 */

function applyTimestampsToDoc(schema, obj, options) {
  if (obj == null || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const el of obj) {
      applyTimestampsToDoc(schema, el, options);
    }
    return;
  }

  if (schema.discriminators && Object.keys(schema.discriminators).length > 0) {
    for (const discriminatorKey of Object.keys(schema.discriminators)) {
      const discriminator = schema.discriminators[discriminatorKey];
      const key = discriminator.discriminatorMapping.key;
      const value = discriminator.discriminatorMapping.value;
      if (obj[key] == value) {
        schema = discriminator;
        break;
      }
    }
  }

  const createdAt = handleTimestampOption(schema.options.timestamps, 'createdAt');
  const updatedAt = handleTimestampOption(schema.options.timestamps, 'updatedAt');
  const currentTime = options?.currentTime;

  let ts = null;
  if (currentTime != null) {
    ts = currentTime();
  } else if (schema.base?.now) {
    ts = schema.base.now();
  } else {
    ts = new Date();
  }

  if (createdAt && obj[createdAt] == null && !options?.isUpdate) {
    obj[createdAt] = ts;
  }
  if (updatedAt) {
    obj[updatedAt] = ts;
  }
}
