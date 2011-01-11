
/**
 * Module dependencies.
 */

var SchemaType = require('../schema').SchemaType
  , CastError = require('../schema').CastError
  , erase = require('../utils').erase;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

var SchemaString = module.exports = function (key, options) {
  SchemaType.call(this, key, options);
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
  for (var i = 0, l = arguments.length; i < l; i++){
    if (arguments[i] == null){
      if (this.enumValidator)
        erase(this.validators, this.enumValidator);
      break;
    } else
      this.enumValues.push(this.cast(validator[i]));
  }

  if (!this.enumValidator){
    var values = this.enumValues;
    this.validators.push([this.enumValidator = function(v){
      return ~values.indexOf(v);
    }, 'enum'];
  }
};

/**
 * Sets a regexp test
 *
 * @param {RegExp} regular expression to test against
 * @param {String} optional validator message
 * @api public
 */

SchemaString.prototype.match = function(regExp){
  this.validators.push([function(v){
    return regExp.test(v);
  }, 'regexp']);
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
  if (value.toString) return value.toString();
  throw new CastError('string', value);
};

/**
 * Module exports.
 */

module.exports = SchemaString;
