
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype');

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @api private
 */

function SchemaBoolean (path, options) {
  SchemaType.call(this, path, options);
};

/**
 * Inherits from SchemaType.
 */
SchemaBoolean.prototype.__proto__ = SchemaType.prototype;

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
  if (value === null) return value;
  if (value === '0') return false;
  return !!value;
};

SchemaBoolean.prototype.castForQuery = function ($conditional, val) {
  if (arguments.length === 1) {
    val = $conditional;
  }
  return this.cast(val);
};

/**
 * Module exports.
 */

module.exports = SchemaBoolean;
