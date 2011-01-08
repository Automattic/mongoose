
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

var SchemaString = module.exports = function (key, options) {
  SchemaType.call(this, key, options);
  this.default('');
  this.enumValues = [];
  this.regExp = null;
};

/**
 * Adds enumeration values
 *
 * @param {multiple} enumeration values
 * @api public
 */

SchemaString.prototype.enum = function(){
  for (var i = 0, l = arguments.length; i < l; i++)
    this.enumValues.push(this.cast(value));
};

/**
 * Sets a regexp test
 *
 * @param {RegExp} regular expression to test against
 * @param {String} optional validator message
 * @api public
 */

SchemaString.prototype.match = function(regExp, msg){
  this.validators.push([function(v){
    return regExp.test(v);
  }, msg]);
};

/**
 * Check required
 *
 * @api private
 */

SchemaString.prototype.checkRequired = function (v) {
  return (v instanceof String || typeof v == 'string') && v.length;
};


/**
 * Casts to String 
 *
 * @api private
 */

SchemaString.prototype.cast = function (value) {
  if (typeof value == 'string')
    return value;
  if (typeof value == 'number')
    return String(value);
  throw new CastError('string', value);
};

/**
 * Module exports.
 */

module.exports = SchemaString;
