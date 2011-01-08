
/**
 * Module requirements.
 */

var SchemaType = require('../schema').SchemaType
  , CastError = require('../schema').CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaDate (key) {
  SchemaDate.call(this, key);
};

/**
 * Required validator for date
 *
 * @api private
 */

SchemaDate.prototype.checkRequired = function (value) {
  return value instanceof Date;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaDate.prototype.cast = function (value) {
  if (value != null && value != undefined){
    if (value instanceof Date)
      return value;

    var date;

    // support for timestamps
    if (value instanceof Number || 'number' == typeof value || String(value) == Number(value))
      date = new Date(Number(value));

    // support for date strings
    else if (value.toString)
      date = new Date(value.toString());

    if (date.toString() != 'Invalid Date')
      return date;
  }
  throw new CastError('date', value);
};

/**
 * Module exports.
 */

module.exports = SchemaDate;
