
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var utils = require('../utils');

/**
 * Mixed SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function Mixed (path, options) {
  if (options && options.default) {
    var def = options.default;
    if (Array.isArray(def) && 0 === def.length) {
      // make sure empty array defaults are handled
      options.default = Array;
    } else if (!options.shared &&
               utils.isObject(def) &&
               0 === Object.keys(def).length) {
      // prevent odd "shared" objects between documents
      options.default = function () {
        return {}
      }
    }
  }

  SchemaType.call(this, path, options);
};

/*!
 * Inherits from SchemaType.
 */

Mixed.prototype.__proto__ = SchemaType.prototype;

/**
 * Required validator
 *
 * @api private
 */

Mixed.prototype.checkRequired = function (val) {
  return (val !== undefined) && (val !== null);
};

/**
 * Casts `val` for Mixed.
 *
 * _this is a no-op_
 *
 * @param {Object} value to cast
 * @api private
 */

Mixed.prototype.cast = function (val) {
  return val;
};

/**
 * Casts contents for queries.
 *
 * @param {String} $cond
 * @param {any} [val]
 * @api private
 */

Mixed.prototype.castForQuery = function ($cond, val) {
  if (arguments.length === 2) return val;
  return $cond;
};

/*!
 * Module exports.
 */

module.exports = Mixed;
