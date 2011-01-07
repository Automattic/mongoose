
/**
 * Module dependencies.
 */

var SchemaType = require('../schema').SchemaType
  , CastError = require('../schema').CastError;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

var String = module.exports = function (key, options) {
  SchemaType.call(this, key, options);
  this.default('');
  this.enumValues = [];
};

/**
 * Adds enumeration values
 *
 * @param {Object} value
 * @api public
 */

String.prototype.enum = function(value){
  if (Array.isArray(value))
    this.enumValues.push.apply(this.enumValues.map(this.cast), value);
  else
    this.enumValues.push(this.cast(value));
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
