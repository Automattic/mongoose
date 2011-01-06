
/**
 * Module dependencies.
 */

var SchemaType = require('./../type').SchemaType
  , CastError = require('./../type').CastError;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

var String = module.exports = function (key) {
  SchemaType.call(this, key);
  this.default('');
};

/**
 * Casts to String 
 *
 * @api private
 */

String.prototype.cast = function (value) {
  if (typeof value == 'string')
    return value;
  if (typeof value == 'number')
    return String(value);
  throw new CastError('string', value);
};

/**
 * Module exports.
 */

module.exports = String;
