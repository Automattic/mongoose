'use strict';

var defineKey = require('../document/compile').defineKey;
var utils = require('../../utils');

var CUSTOMIZABLE_DISCRIMINATOR_OPTIONS = {
  toJSON: true,
  toObject: true,
  _id: true,
  id: true
};

/*!
 * ignore
 */

module.exports = function discriminator(model, name, schema, tiedValue) {
  if (!(schema && schema.instanceOfSchema)) {
    throw new Error('You must pass a valid discriminator Schema');
  }

  if (model.base && model.base.options.applyPluginsToDiscriminators) {
    model.base._applyPlugins(schema);
  }

  if (model.schema.discriminatorMapping &&
      !model.schema.discriminatorMapping.isRoot) {
    throw new Error('Discriminator "' + name +
        '" can only be a discriminator of the root model');
  }

  var key = model.schema.options.discriminatorKey;

  var baseSchemaAddition = {};
  baseSchemaAddition[key] = {
    default: void 0,
    select: true,
    $skipDiscriminatorCheck: true
  };
  baseSchemaAddition[key][model.schema.options.typeKey] = String;
  model.schema.add(baseSchemaAddition);
  defineKey(key, null, model.prototype, null, [key], model.schema.options);

  if (schema.path(key) && schema.path(key).options.$skipDiscriminatorCheck !== true) {
    throw new Error('Discriminator "' + name +
        '" cannot have field with name "' + key + '"');
  }

  var value = name;
  if (typeof tiedValue == 'string' && tiedValue.length) {
    value = tiedValue;
  }

  function merge(schema, baseSchema) {
    if (baseSchema.paths._id &&
        baseSchema.paths._id.options &&
        !baseSchema.paths._id.options.auto) {
      var originalSchema = schema;
      utils.merge(schema, originalSchema);
      delete schema.paths._id;
      delete schema.tree._id;
    }

    // Find conflicting paths: if something is a path in the base schema
    // and a nested path in the child schema, overwrite the base schema path.
    // See gh-6076
    var baseSchemaPaths = Object.keys(baseSchema.paths);
    var conflictingPaths = [];
    for (i = 0; i < baseSchemaPaths.length; ++i) {
      if (schema.nested[baseSchemaPaths[i]]) {
        conflictingPaths.push(baseSchemaPaths[i]);
      }
    }

    utils.merge(schema, baseSchema, {
      omit: { discriminators: true },
      omitNested: conflictingPaths.reduce((cur, path) => {
        cur['tree.' + path] = true;
        return cur;
      }, {})
    });

    // Clean up conflicting paths _after_ merging re: gh-6076
    for (i = 0; i < conflictingPaths.length; ++i) {
      delete schema.paths[conflictingPaths[i]];
    }

    var obj = {};
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
    obj[key][schema.options.typeKey] = String;
    schema.add(obj);
    schema.discriminatorMapping = {key: key, value: value, isRoot: false};

    if (baseSchema.options.collection) {
      schema.options.collection = baseSchema.options.collection;
    }

    var toJSON = schema.options.toJSON;
    var toObject = schema.options.toObject;
    var _id = schema.options._id;
    var id = schema.options.id;

    var keys = Object.keys(schema.options);
    schema.options.discriminatorKey = baseSchema.options.discriminatorKey;

    for (var i = 0; i < keys.length; ++i) {
      var _key = keys[i];
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

    schema.plugins = Array.prototype.slice(baseSchema.plugins);
    schema.callQueue = baseSchema.callQueue.concat(schema.callQueue);
    schema._requiredpaths = undefined; // reset just in case Schema#requiredPaths() was called on either schema
  }

  // merges base schema into new discriminator schema and sets new type field.
  merge(schema, model.schema);

  if (!model.discriminators) {
    model.discriminators = {};
  }

  if (!model.schema.discriminatorMapping) {
    model.schema.discriminatorMapping = {key: key, value: null, isRoot: true};
    model.schema.discriminators = {};
  }

  model.schema.discriminators[name] = schema;

  if (model.discriminators[name]) {
    throw new Error('Discriminator with name "' + name + '" already exists');
  }

  return schema;
};
