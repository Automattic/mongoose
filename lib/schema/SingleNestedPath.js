'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const EventEmitter = require('events').EventEmitter;
const ObjectExpectedError = require('../error/objectExpected');
const SchemaSingleNestedOptions = require('../options/SchemaSingleNestedOptions');
const SchemaType = require('../schematype');
const $exists = require('./operators/exists');
const castToNumber = require('./operators/helpers').castToNumber;
const discriminator = require('../helpers/model/discriminator');
const geospatial = require('./operators/geospatial');
const get = require('../helpers/get');
const getConstructor = require('../helpers/discriminator/getConstructor');
const handleIdOption = require('../helpers/schema/handleIdOption');
const internalToObjectOptions = require('../options').internalToObjectOptions;

let Subdocument;

module.exports = SingleNestedPath;

/**
 * Single nested subdocument SchemaType constructor.
 *
 * @param {Schema} schema
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SingleNestedPath(schema, path, options) {
  schema = handleIdOption(schema, options);

  this.caster = _createConstructor(schema);
  this.caster.path = path;
  this.caster.prototype.$basePath = path;
  this.schema = schema;
  this.$isSingleNested = true;
  SchemaType.call(this, path, options, 'Embedded');
}

/*!
 * ignore
 */

SingleNestedPath.prototype = Object.create(SchemaType.prototype);
SingleNestedPath.prototype.constructor = SingleNestedPath;
SingleNestedPath.prototype.OptionsConstructor = SchemaSingleNestedOptions;

/*!
 * ignore
 */

function _createConstructor(schema, baseClass) {
  // lazy load
  Subdocument || (Subdocument = require('../types/subdocument'));

  const _embedded = function SingleNested(value, path, parent) {
    const _this = this;

    this.$parent = parent;
    Subdocument.apply(this, arguments);

    this.$session(this.ownerDocument().$session());

    if (parent) {
      parent.on('save', function() {
        _this.emit('save', _this);
        _this.constructor.emit('save', _this);
      });

      parent.on('isNew', function(val) {
        _this.isNew = val;
        _this.emit('isNew', val);
        _this.constructor.emit('isNew', val);
      });
    }
  };

  const proto = baseClass != null ? baseClass.prototype : Subdocument.prototype;
  _embedded.prototype = Object.create(proto);
  _embedded.prototype.$__setSchema(schema);
  _embedded.prototype.constructor = _embedded;
  _embedded.schema = schema;
  _embedded.$isSingleNested = true;
  _embedded.events = new EventEmitter();
  _embedded.prototype.toBSON = function() {
    return this.toObject(internalToObjectOptions);
  };

  // apply methods
  for (const i in schema.methods) {
    _embedded.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (const i in schema.statics) {
    _embedded[i] = schema.statics[i];
  }

  for (const i in EventEmitter.prototype) {
    _embedded[i] = EventEmitter.prototype[i];
  }

  return _embedded;
}

/*!
 * Special case for when users use a common location schema to represent
 * locations for use with $geoWithin.
 * https://docs.mongodb.org/manual/reference/operator/query/geoWithin/
 *
 * @param {Object} val
 * @api private
 */

SingleNestedPath.prototype.$conditionalHandlers.$geoWithin = function handle$geoWithin(val) {
  return { $geometry: this.castForQuery(val.$geometry) };
};

/*!
 * ignore
 */

SingleNestedPath.prototype.$conditionalHandlers.$near =
SingleNestedPath.prototype.$conditionalHandlers.$nearSphere = geospatial.cast$near;

SingleNestedPath.prototype.$conditionalHandlers.$within =
SingleNestedPath.prototype.$conditionalHandlers.$geoWithin = geospatial.cast$within;

SingleNestedPath.prototype.$conditionalHandlers.$geoIntersects =
  geospatial.cast$geoIntersects;

SingleNestedPath.prototype.$conditionalHandlers.$minDistance = castToNumber;
SingleNestedPath.prototype.$conditionalHandlers.$maxDistance = castToNumber;

SingleNestedPath.prototype.$conditionalHandlers.$exists = $exists;

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

SingleNestedPath.prototype.cast = function(val, doc, init, priorVal) {
  if (val && val.$isSingleNested && val.parent === doc) {
    return val;
  }

  if (val != null && (typeof val !== 'object' || Array.isArray(val))) {
    throw new ObjectExpectedError(this.path, val);
  }

  const Constructor = getConstructor(this.caster, val);

  let subdoc;

  // Only pull relevant selected paths and pull out the base path
  const parentSelected = get(doc, '$__.selected', {});
  const path = this.path;
  const selected = Object.keys(parentSelected).reduce((obj, key) => {
    if (key.startsWith(path + '.')) {
      obj[key.substr(path.length + 1)] = parentSelected[key];
    }
    return obj;
  }, {});

  if (init) {
    subdoc = new Constructor(void 0, selected, doc);
    subdoc.init(val);
  } else {
    if (Object.keys(val).length === 0) {
      return new Constructor({}, selected, doc);
    }

    return new Constructor(val, selected, doc, undefined, { priorDoc: priorVal });
  }

  return subdoc;
};

/**
 * Casts contents for query
 *
 * @param {string} [$conditional] optional query operator (like `$eq` or `$in`)
 * @param {any} value
 * @api private
 */

SingleNestedPath.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional);
    }
    return handler.call(this, val);
  }
  val = $conditional;
  if (val == null) {
    return val;
  }

  if (this.options.runSetters) {
    val = this._applySetters(val);
  }

  const Constructor = getConstructor(this.caster, val);

  try {
    val = new Constructor(val);
  } catch (error) {
    // Make sure we always wrap in a CastError (gh-6803)
    if (!(error instanceof CastError)) {
      throw new CastError('Embedded', val, this.path, error, this);
    }
    throw error;
  }
  return val;
};

/**
 * Async validation on this single nested doc.
 *
 * @api private
 */

SingleNestedPath.prototype.doValidate = function(value, fn, scope, options) {
  const Constructor = getConstructor(this.caster, value);

  if (options && options.skipSchemaValidators) {
    if (!(value instanceof Constructor)) {
      value = new Constructor(value, null, scope);
    }

    return value.validate(fn);
  }

  SchemaType.prototype.doValidate.call(this, value, function(error) {
    if (error) {
      return fn(error);
    }
    if (!value) {
      return fn(null);
    }

    value.validate(fn);
  }, scope);
};

/**
 * Synchronously validate this single nested doc
 *
 * @api private
 */

SingleNestedPath.prototype.doValidateSync = function(value, scope, options) {
  if (!options || !options.skipSchemaValidators) {
    const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value, scope);
    if (schemaTypeError) {
      return schemaTypeError;
    }
  }
  if (!value) {
    return;
  }
  return value.validateSync();
};

/**
 * Adds a discriminator to this single nested subdocument.
 *
 * ####Example:
 *     const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
 *     const schema = Schema({ shape: shapeSchema });
 *
 *     const singleNestedPath = parentSchema.path('shape');
 *     singleNestedPath.discriminator('Circle', Schema({ radius: Number }));
 *
 * @param {String} name
 * @param {Schema} schema fields to add to the schema for instances of this sub-class
 * @param {String} [value] the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
 * @return {Function} the constructor Mongoose will use for creating instances of this discriminator model
 * @see discriminators /docs/discriminators.html
 * @api public
 */

SingleNestedPath.prototype.discriminator = function(name, schema, value) {
  discriminator(this.caster, name, schema, value);

  this.caster.discriminators[name] = _createConstructor(schema, this.caster);

  return this.caster.discriminators[name];
};

/*!
 * ignore
 */

SingleNestedPath.prototype.clone = function() {
  const options = Object.assign({}, this.options);
  const schematype = new this.constructor(this.schema, this.path, options);
  schematype.validators = this.validators.slice();
  schematype.caster.discriminators = Object.assign({}, this.caster.discriminators);
  return schematype;
};
