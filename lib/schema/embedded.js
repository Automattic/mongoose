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

  this._embedded = _embedded;
  SchemaType.call(this, path, options, 'Embedded');
}

Embedded.prototype = Object.create(SchemaType.prototype);

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.cast = function(val) {
  return new this._embedded(val);
};

/**
 * Casts contents for query
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.castForQuery = function(val) {
  return new this._embedded(val).toObject({ virtuals: false });
};
