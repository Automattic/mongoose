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

module.exports = function discriminator(model, name, schema) {
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
    set: function(newName) {
      if (newName === name) {
        return name;
      }
      throw new Error('Can\'t set discriminator key "' + key + '", "' +
        name + '" !== "' + newName + '"');
    },
    $skipDiscriminatorCheck: false
  };
  baseSchemaAddition[key][model.schema.options.typeKey] = String;
  model.schema.add(baseSchemaAddition);
  defineKey(key, null, model.prototype, null, [key], model.schema.options);

  if (schema.path(key) && !schema.path(key).$skipDiscriminatorCheck) {
    throw new Error('Discriminator "' + name +
        '" cannot have field with name "' + key + '"');
  }

  function merge(schema, baseSchema) {
    if (baseSchema.paths._id &&
        baseSchema.paths._id.options &&
        !baseSchema.paths._id.options.auto) {
      var originalSchema = schema;
      utils.merge(schema, originalSchema, { retainKeyOrder: true });
      delete schema.paths._id;
      delete schema.tree._id;
    }
    utils.merge(schema, baseSchema, { retainKeyOrder: true });

    var obj = {};
    obj[key] = {
      default: name,
      select: true,
      set: function(newName) {
        if (newName === name) {
          return name;
        }
        throw new Error('Can\'t set discriminator key "' + key + '"');
      }
    };
    obj[key][schema.options.typeKey] = String;
    schema.add(obj);
    schema.discriminatorMapping = {key: key, value: name, isRoot: false};

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
    schema.callQueue = baseSchema.callQueue.
      concat(schema.callQueue.slice(schema._defaultMiddleware.length));
    schema._requiredpaths = undefined; // reset just in case Schema#requiredPaths() was called on either schema
  }

  // merges base schema into new discriminator schema and sets new type field.
  merge(schema, model.schema);

  if (!model.discriminators) {
    model.discriminators = {};
  }

  if (!model.schema.discriminatorMapping) {
    model.schema.discriminatorMapping = {key: key, value: null, isRoot: true};
  }

  if (model.discriminators[name]) {
    throw new Error('Discriminator with name "' + name + '" already exists');
  }

  return schema;
};
