
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function SchemaString (key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options);
};

/**
 * Inherits from SchemaType.
 */

SchemaString.prototype.__proto__ = SchemaType.prototype;

/**
 * Adds enumeration values
 *
 * @param {multiple} enumeration values
 * @api public
 */

SchemaString.prototype.enum = function(){
  for (var i = 0, l = arguments.length; i < l; i++){
    if (arguments[i] == null){
      if (this.enumValidator){
        this.enumValidator = false;
        this.validators = this.validators.filter(function(v){
          return v[1] != 'enum';
        });
      }
      break;
    } else
      this.enumValues.push(this.cast(arguments[i]));
  }

  if (!this.enumValidator){
    var values = this.enumValues;
    this.enumValidator = function(v){
      return ~values.indexOf(v);
    };
    this.validators.push([this.enumValidator, 'enum']);
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
