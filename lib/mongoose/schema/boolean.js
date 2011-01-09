
/**
 * Module dependencies.
 */

var SchemaType = require('../schema').SchemaType
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
  if (value != null && value != undefined)
    return !!value;
  throw new CastError('boolean', value);
};

/**
 * Module exports.
 */

module.exports = SchemaBoolean;
