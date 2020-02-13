/*!
 * Module dependencies.
 */

'use strict';

const SchemaType = require('../schematype');
const symbols = require('./symbols');
const isObject = require('../helpers/isObject');

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
    const def = options.default;
    if (Array.isArray(def) && def.length === 0) {
      // make sure empty array defaults are handled
      options.default = Array;
    } else if (!options.shared && isObject(def) && Object.keys(def).length === 0) {
      // prevent odd "shared" objects between documents
      options.default = function() {
        return {};
      };
    }
  }

  SchemaType.call(this, path, options, 'Mixed');

  this[symbols.schemaMixedSymbol] = true;
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Mixed.schemaName = 'Mixed';

Mixed.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
Mixed.prototype = Object.create(SchemaType.prototype);
Mixed.prototype.constructor = Mixed;

/**
 * Attaches a getter for all Mixed paths.
 *
 * ####Example:
 *
 *     // Hide the 'hidden' path
 *     mongoose.Schema.Mixed.get(v => Object.assign({}, v, { hidden: null }));
 *
 *     const Model = mongoose.model('Test', new Schema({ test: {} }));
 *     new Model({ test: { hidden: 'Secret!' } }).test.hidden; // null
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

Mixed.get = SchemaType.get;

/**
 * Sets a default option for all Mixed instances.
 *
 * ####Example:
 *
 *     // Make all mixed instances have `required` of true by default.
 *     mongoose.Schema.Mixed.set('required', true);
 *
 *     const User = mongoose.model('User', new Schema({ test: mongoose.Mixed }));
 *     new User({ }).validateSync().errors.test.message; // Path `test` is required.
 *
 * @param {String} option - The option you'd like to set the value for
 * @param {*} value - value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

Mixed.set = SchemaType.set;

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
