
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
  // make sure empty array defaults are handled
  if (options &&
      options.default &&
      Array.isArray(options.default) &&
      0 === options.default.length) {
    options.default = Array;
  }

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

Mixed.prototype.checkRequired = function (val) {
  return true;
};

/**
 * Noop casting
 *
 * @param {Object} value to cast
 * @api private
 */

Mixed.prototype.cast = function (val) {
  return val;
};

Mixed.prototype.castForQuery = function ($cond, val) {
  if (arguments.length === 2) return val;
  return $cond;
};

/**
 * Module exports.
 */

module.exports = Mixed;
