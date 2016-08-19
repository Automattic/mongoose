'use strict';

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var Subdocument = require('../types/subdocument');
var castToNumber = require('./operators/helpers').castToNumber;
var geospatial = require('./operators/geospatial');

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
  var _embedded = function(value, path, parent) {
    var _this = this;
    Subdocument.apply(this, arguments);
    this.$parent = parent;
    if (parent) {
      parent.on('save', function() {
        _this.emit('save', _this);
      });

      parent.on('isNew', function(val) {
        _this.isNew = val;
        _this.emit('isNew', val);
      });
    }
  };
  _embedded.prototype = Object.create(Subdocument.prototype);
  _embedded.prototype.$__setSchema(schema);
  _embedded.schema = schema;
  _embedded.$isSingleNested = true;
  _embedded.prototype.$basePath = path;

  // apply methods
  for (var i in schema.methods) {
    _embedded.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (i in schema.statics) {
    _embedded[i] = schema.statics[i];
  }

  this.caster = _embedded;
  this.schema = schema;
  this.$isSingleNested = true;
  SchemaType.call(this, path, options, 'Embedded');
}

Embedded.prototype = Object.create(SchemaType.prototype);

/**
 * Special case for when users use a common location schema to represent
 * locations for use with $geoWithin.
 * https://docs.mongodb.org/manual/reference/operator/query/geoWithin/
 *
 * @param {Object} val
 * @api private
 */

Embedded.prototype.$conditionalHandlers.$geoWithin = function(val) {
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

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.cast = function(val, doc, init) {
  if (val && val.$isSingleNested) {
    return val;
  }
  var subdoc = new this.caster(void 0, doc ? doc.$__.selected : void 0, doc);
  if (init) {
    subdoc.init(val);
  } else {
    subdoc.set(val, undefined, true);
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
  return new this.caster(val).toObject({virtuals: false});
};

/**
 * Async validation on this single nested doc.
 *
 * @api private
 */

Embedded.prototype.doValidate = function(value, fn) {
  SchemaType.prototype.doValidate.call(this, value, function(error) {
    if (error) {
      return fn(error);
    }
    if (!value) {
      return fn(null);
    }
    value.validate(fn, {__noPromise: true});
  });
};

/**
 * Synchronously validate this single nested doc
 *
 * @api private
 */

Embedded.prototype.doValidateSync = function(value) {
  var schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value);
  if (schemaTypeError) {
    return schemaTypeError;
  }
  if (!value) {
    return;
  }
  return value.validateSync();
};
