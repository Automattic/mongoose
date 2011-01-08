
/**
 * Module requirements.
 */

var SchemaType = require('../schema').SchemaType
  , CastError = require('../schema').CastError;

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaNumber (key) {
  SchemaType.call(this, key);
};

/**
 * Required validator for number
 *
 * @api private
 */

SchemaNumber.prototype.checkRequired = function (value) {
  return typeof value == 'number' || value instanceof Number;
};

/**
 * Casts to number
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaNumber.prototype.cast = function (value) {
  if (value != null && value != undefined && !isNaN(value)){
    if (value instanceof Number || typeof value == 'number')
      return value;
    if (value.toString && value.toString() == Number(value))
      return Number(value);
  }
  throw new CastError('number', value);
};

/**
 * Module exports.
 */

module.exports = SchemaNumber;
