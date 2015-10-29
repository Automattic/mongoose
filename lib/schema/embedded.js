var SchemaType = require('../schematype');
var Subdocument = require('../types/subdocument');

module.exports = Embedded;

/**
 * Sub-schema schematype constructor
 *
 * @param {Schema} schema
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function Embedded(schema, path, options) {
  var _embedded = function() {
    Subdocument.apply(this, arguments);
  };
  _embedded.prototype = Object.create(Subdocument.prototype);
  _embedded.prototype.$__setSchema(schema);
  _embedded.schema = schema;
  _embedded.$isSingleNested = true;
  _embedded.prototype.$basePath = path;

  this.caster = _embedded;
  this.schema = schema;
  this.$isSingleNested = true;
  SchemaType.call(this, path, options, 'Embedded');
}

Embedded.prototype = Object.create(SchemaType.prototype);

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.cast = function(val, doc) {
  var subdoc = new this.caster();
  subdoc = subdoc.init(val);
  subdoc.$parent = doc;
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
  } else {
    val = $conditional;
    return new this.caster(val).
      toObject({ virtuals: false });
  }
};

Embedded.prototype.doValidate = function(value, fn) {
  value.validate(fn, { __noPromise: true });
};

Embedded.prototype.doValidateSync = function(value) {
  return value.validateSync();
};
