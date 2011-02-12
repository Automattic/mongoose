
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype');

/**
 * Mixed SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @api private
 */

function SchemaMixed (path, options) {
  SchemaType.call(this, path, options);
};

/**
 * Inherits from SchemaType.
 */
SchemaMixed.prototype.__proto__ = SchemaType.prototype;

/**
 * Required validator for mixed type
 *
 * @api private
 */

SchemaMixed.prototype.checkRequired = function (value) {
  return true;
};

/**
 * Noop casting
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaMixed.prototype.cast = function (value) {
  return value;
};

SchemaMixed.prototype.castForQuery = SchemaMixed.prototype.cast;

/**
 * Module exports.
 */

module.exports = SchemaMixed;
