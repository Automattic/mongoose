/*!
 * Module dependencies.
 */

var utils = require('../utils');

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;

const convertToTrue = [true, 'true', 1, '1', 'yes'];
const convertToFalse = [false, 'false', 0, '0', 'no'];

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBoolean(path, options) {
  SchemaType.call(this, path, options, 'Boolean');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBoolean.schemaName = 'Boolean';

/*!
 * Inherits from SchemaType.
 */
SchemaBoolean.prototype = Object.create(SchemaType.prototype);
SchemaBoolean.prototype.constructor = SchemaBoolean;

/**
 * Check if the given value satisfies a required validator. For a boolean
 * to satisfy a required validator, it must be strictly equal to true or to
 * false.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaBoolean.prototype.checkRequired = function(value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @param {Object} model - this value is optional
 * @api private
 */

SchemaBoolean.prototype.cast = function(value) {
  if (value == null) {
    return value;
  }

  // strict mode (throws if value is not a boolean, instead of converting)
  if (convertToTrue.indexOf(value) !== -1) {
    return true;
  }
  if (convertToFalse.indexOf(value) !== -1) {
    return false;
  }
  throw new CastError('boolean', value, this.path);
};

SchemaBoolean.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {});

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaBoolean.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = SchemaBoolean.$conditionalHandlers[$conditional];

    if (handler) {
      return handler.call(this, val);
    }

    return this._castForQuery(val);
  }

  return this._castForQuery($conditional);
};

/*!
 * Module exports.
 */

module.exports = SchemaBoolean;
