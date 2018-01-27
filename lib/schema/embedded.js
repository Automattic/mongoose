'use strict';

/*!
 * Module dependencies.
 */

const $exists = require('./operators/exists');
const EventEmitter = require('events').EventEmitter;
const SchemaType = require('../schematype');
const castToNumber = require('./operators/helpers').castToNumber;
const discriminator = require('../services/model/discriminator');
const geospatial = require('./operators/geospatial');
const internalToObjectOptions = require('../options').internalToObjectOptions;

let Subdocument;

module.exports = Embedded;

/**
 * Sub-schema schematype constructor
 *
 * @param {Schema} schema
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function Embedded(schema, path, options) {
  this.caster = _createConstructor(schema);
  this.caster.prototype.$basePath = path;
  this.schema = schema;
  this.$isSingleNested = true;
  SchemaType.call(this, path, options, 'Embedded');
}

/*!
 * ignore
 */

Embedded.prototype = Object.create(SchemaType.prototype);

/*!
 * ignore
 */

function _createConstructor(schema) {
  // lazy load
  Subdocument || (Subdocument = require('../types/subdocument'));

  var _embedded = function SingleNested(value, path, parent) {
    var _this = this;

    this.$parent = parent;
    Subdocument.apply(this, arguments);

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
  _embedded.prototype = Object.create(Subdocument.prototype);
  _embedded.prototype.$__setSchema(schema);
  _embedded.prototype.constructor = _embedded;
  _embedded.schema = schema;
  _embedded.$isSingleNested = true;
  _embedded.prototype.toBSON = function() {
    return this.toObject(internalToObjectOptions);
  };

  // apply methods
  for (var i in schema.methods) {
    _embedded.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (i in schema.statics) {
    _embedded[i] = schema.statics[i];
  }

  for (i in EventEmitter.prototype) {
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

Embedded.prototype.$conditionalHandlers.$geoWithin = function handle$geoWithin(val) {
  return { $geometry: this.castForQuery(val.$geometry) };
};

/*!
 * ignore
 */

Embedded.prototype.$conditionalHandlers.$near =
Embedded.prototype.$conditionalHandlers.$nearSphere = geospatial.cast$near;

Embedded.prototype.$conditionalHandlers.$within =
Embedded.prototype.$conditionalHandlers.$geoWithin = geospatial.cast$within;

Embedded.prototype.$conditionalHandlers.$geoIntersects =
  geospatial.cast$geoIntersects;

Embedded.prototype.$conditionalHandlers.$minDistance = castToNumber;
Embedded.prototype.$conditionalHandlers.$maxDistance = castToNumber;

Embedded.prototype.$conditionalHandlers.$exists = $exists;

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.cast = function(val, doc, init, priorVal) {
  if (val && val.$isSingleNested) {
    return val;
  }

  var Constructor = this.caster;
  var discriminatorKey = Constructor.schema.options.discriminatorKey;
  if (val != null &&
      Constructor.discriminators &&
      typeof val[discriminatorKey] === 'string' &&
      Constructor.discriminators[val[discriminatorKey]]) {
    Constructor = Constructor.discriminators[val[discriminatorKey]];
  }

  var subdoc;
  if (init) {
    subdoc = new Constructor(void 0, doc ? doc.$__.selected : void 0, doc);
    subdoc.init(val);
  } else {
    if (Object.keys(val).length === 0) {
      return new Constructor({}, doc ? doc.$__.selected : void 0, doc);
    }

    return new Constructor(val, doc ? doc.$__.selected : void 0, doc, undefined, {
      priorDoc: priorVal
    });
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

Embedded.prototype.castForQuery = function($conditional, val) {
  var handler;
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

  return new this.caster(val);
};

/**
 * Async validation on this single nested doc.
 *
 * @api private
 */

Embedded.prototype.doValidate = function(value, fn, scope) {
  var Constructor = this.caster;
  var discriminatorKey = Constructor.schema.options.discriminatorKey;
  if (value != null &&
      Constructor.discriminators &&
      typeof value[discriminatorKey] === 'string' &&
      Constructor.discriminators[value[discriminatorKey]]) {
    Constructor = Constructor.discriminators[value[discriminatorKey]];
  }

  SchemaType.prototype.doValidate.call(this, value, function(error) {
    if (error) {
      return fn(error);
    }
    if (!value) {
      return fn(null);
    }

    if (!(value instanceof Constructor)) {
      value = new Constructor(value);
    }
    value.validate({__noPromise: true}, fn);
  }, scope);
};

/**
 * Synchronously validate this single nested doc
 *
 * @api private
 */

Embedded.prototype.doValidateSync = function(value, scope) {
  var schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value, scope);
  if (schemaTypeError) {
    return schemaTypeError;
  }
  if (!value) {
    return;
  }
  return value.validateSync();
};

/**
 * Adds a discriminator to this property
 *
 * @param {String} name
 * @param {Schema} schema fields to add to the schema for instances of this sub-class
 * @api public
 */

Embedded.prototype.discriminator = function(name, schema) {
  discriminator(this.caster, name, schema);

  this.caster.discriminators[name] = _createConstructor(schema);

  return this.caster.discriminators[name];
};
