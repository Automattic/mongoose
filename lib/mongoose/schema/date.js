
/**
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaDate (key) {
  SchemaType.call(this, key);
};

/**
 * Inherits from SchemaType.
 */

SchemaDate.prototype.__proto__ = SchemaType.prototype;

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
  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (value instanceof Number || 'number' == typeof value 
      || String(value) == Number(value))
    date = new Date(Number(value));

  // support for date strings
  else if (value.toString)
    date = new Date(value.toString());

  if (date.toString() != 'Invalid Date')
    return date;

  throw new CastError('date', value);
};

/**
 * Module exports.
 */

module.exports = SchemaDate;
