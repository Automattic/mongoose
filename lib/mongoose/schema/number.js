
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

function Number (key) {
  SchemaType.call(this, key);
};

/**
 * Casts to number
 *
 * @param {Object} value to cast
 * @api private
 */

Number.prototype.cast = function (value) {
  if (typeof value == 'number')
    return value;
  if (typeof value == 'string' && value == Number(value))
    return Number(value);
  throw new CastError('number', value);
};

/**
 * Module exports.
 */

module.exports = Number;
