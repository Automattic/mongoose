
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = require('../schema').CastError;

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaBoolean (key) {
  SchemaBoolean.call(this, key);
};

/**
 * Required validator for date
 *
 * @api private
 */

SchemaBoolean.prototype.checkRequired = function (value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaBoolean.prototype.cast = function (value) {
  return !!value;
};

/**
 * Module exports.
 */

module.exports = SchemaBoolean;
