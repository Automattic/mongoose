'use strict';

const defineKey = require('../document/compile').defineKey;
const get = require('../get');
const utils = require('../../utils');

const CUSTOMIZABLE_DISCRIMINATOR_OPTIONS = {
  toJSON: true,
  toObject: true,
  _id: true,
  id: true
};

/*!
 * ignore
 */

module.exports = function discriminator(model, name, schema, tiedValue, applyPlugins) {
  if (!(schema && schema.instanceOfSchema)) {
    throw new Error('You must pass a valid discriminator Schema');
  }

  if (model.schema.discriminatorMapping &&
      !model.schema.discriminatorMapping.isRoot) {
    throw new Error('Discriminator "' + name +
        '" can only be a discriminator of the root model');
  }

  if (applyPlugins) {
    const applyPluginsToDiscriminators = get(model.base,
      'options.applyPluginsToDiscriminators', false);
    // Even if `applyPluginsToDiscriminators` isn't set, we should still apply
    // global plugins to schemas embedded in the discriminator schema (gh-7370)
    model.base._applyPlugins(schema, {
      skipTopLevel: !applyPluginsToDiscriminators
    });
  }

  const key = model.schema.options.discriminatorKey;

  const existingPath = model.schema.path(key);
  if (existingPath != null) {
    if (!utils.hasUserDefinedProperty(existingPath.options, 'select')) {
      existingPath.options.select = true;
    }
    existingPath.options.$skipDiscriminatorCheck = true;
  } else {
    const baseSchemaAddition = {};
    baseSchemaAddition[key] = {
      default: void 0,
      select: true,
      $skipDiscriminatorCheck: true
    };
    baseSchemaAddition[key][model.schema.options.typeKey] = String;
    model.schema.add(baseSchemaAddition);
    defineKey(key, null, model.prototype, null, [key], model.schema.options);
  }

  if (schema.path(key) && schema.path(key).options.$skipDiscriminatorCheck !== true) {
    throw new Error('Discriminator "' + name +
        '" cannot have field with name "' + key + '"');
  }

  let value = name;
  if (typeof tiedValue == 'string' && tiedValue.length) {
    value = tiedValue;
  }

  function merge(schema, baseSchema) {
    // Retain original schema before merging base schema
    schema._baseSchema = baseSchema;
    if (baseSchema.paths._id &&
        baseSchema.paths._id.options &&
        !baseSchema.paths._id.options.auto) {
      schema.remove('_id');
    }

    // Find conflicting paths: if something is a path in the base schema
    // and a nested path in the child schema, overwrite the base schema path.
    // See gh-6076
    const baseSchemaPaths = Object.keys(baseSchema.paths);
    const conflictingPaths = [];
    for (let i = 0; i < baseSchemaPaths.length; ++i) {
      if (schema.nested[baseSchemaPaths[i]]) {
        conflictingPaths.push(baseSchemaPaths[i]);
      }
    }

    utils.merge(schema, baseSchema, {
      omit: { discriminators: true, base: true },
      omitNested: conflictingPaths.reduce((cur, path) => {
        cur['tree.' + path] = true;
        return cur;
      }, {})
    });

    // Clean up conflicting paths _after_ merging re: gh-6076
    for (let i = 0; i < conflictingPaths.length; ++i) {
      delete schema.paths[conflictingPaths[i]];
    }

    // Rebuild schema models because schemas may have been merged re: #7884
    schema.childSchemas.forEach(obj => {
      obj.model.prototype.$__setSchema(obj.schema);
    });

    const obj = {};
    obj[key] = {
      default: value,
      select: true,
      set: function(newName) {
        if (newName === value) {
          return value;
        }
        throw new Error('Can\'t set discriminator key "' + key + '"');
      },
      $skipDiscriminatorCheck: true
    };
    obj[key][schema.options.typeKey] = existingPath ?
      existingPath.instance :
      String;
    schema.add(obj);
    schema.discriminatorMapping = { key: key, value: value, isRoot: false };

    if (baseSchema.options.collection) {
      schema.options.collection = baseSchema.options.collection;
    }

    const toJSON = schema.options.toJSON;
    const toObject = schema.options.toObject;
    const _id = schema.options._id;
    const id = schema.options.id;

    const keys = Object.keys(schema.options);
    schema.options.discriminatorKey = baseSchema.options.discriminatorKey;

    for (let i = 0; i < keys.length; ++i) {
      const _key = keys[i];
      if (!CUSTOMIZABLE_DISCRIMINATOR_OPTIONS[_key]) {
        if (!utils.deepEqual(schema.options[_key], baseSchema.options[_key])) {
          throw new Error('Can\'t customize discriminator option ' + _key +
              ' (can only modify ' +
              Object.keys(CUSTOMIZABLE_DISCRIMINATOR_OPTIONS).join(', ') +
              ')');
        }
      }
    }

    schema.options = utils.clone(baseSchema.options);
    if (toJSON) schema.options.toJSON = toJSON;
    if (toObject) schema.options.toObject = toObject;
    if (typeof _id !== 'undefined') {
      schema.options._id = _id;
    }
    schema.options.id = id;
    schema.s.hooks = model.schema.s.hooks.merge(schema.s.hooks);

    schema.plugins = Array.prototype.slice.call(baseSchema.plugins);
    schema.callQueue = baseSchema.callQueue.concat(schema.callQueue);
    delete schema._requiredpaths; // reset just in case Schema#requiredPaths() was called on either schema
  }

  // merges base schema into new discriminator schema and sets new type field.
  merge(schema, model.schema);

  if (!model.discriminators) {
    model.discriminators = {};
  }

  if (!model.schema.discriminatorMapping) {
    model.schema.discriminatorMapping = { key: key, value: null, isRoot: true };
  }
  if (!model.schema.discriminators) {
    model.schema.discriminators = {};
  }

  model.schema.discriminators[name] = schema;

  if (model.discriminators[name]) {
    throw new Error('Discriminator with name "' + name + '" already exists');
  }

  return schema;
};
