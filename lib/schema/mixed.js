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
 * @api public
 */

function Mixed(path, options) {
  if (options && options.default) {
    var def = options.default;
    if (Array.isArray(def) && def.length === 0) {
      // make sure empty array defaults are handled
      options.default = Array;
    } else if (!options.shared && utils.isObject(def) && Object.keys(def).length === 0) {
      // prevent odd "shared" objects between documents
      options.default = function() {
        return {};
      };
    }
  }

  SchemaType.call(this, path, options, 'Mixed');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Mixed.schemaName = 'Mixed';

/*!
 * Inherits from SchemaType.
 */
Mixed.prototype = Object.create(SchemaType.prototype);
Mixed.prototype.constructor = Mixed;

/**
 * Casts `val` for Mixed.
 *
 * _this is a no-op_
 *
 * @param {Object} value to cast
 * @api private
 */

Mixed.prototype.cast = function(val) {
  return val;
};

/**
 * Casts contents for queries.
 *
 * @param {String} $cond
 * @param {any} [val]
 * @api private
 */

Mixed.prototype.castForQuery = function($cond, val) {
  if (arguments.length === 2) {
    return val;
  }
  return $cond;
};

/*!
 * Module exports.
 */

module.exports = Mixed;
