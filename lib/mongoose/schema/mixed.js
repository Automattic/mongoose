
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

function Mixed (path, options) {
  SchemaType.call(this, path, options);
};

/**
 * Inherits from SchemaType.
 */
Mixed.prototype.__proto__ = SchemaType.prototype;

/**
 * Required validator for mixed type
 *
 * @api private
 */

Mixed.prototype.checkRequired = function (value) {
  return true;
};

/**
 * Noop casting
 *
 * @param {Object} value to cast
 * @api private
 */

Mixed.prototype.cast = function (value) {
  return value;
};

Mixed.prototype.castForQuery = Mixed.prototype.cast;

/**
 * Module exports.
 */

module.exports = Mixed;
