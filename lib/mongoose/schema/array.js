
/**
 * Module dependencies.
 */

var SchemaType = require('../schema').SchemaType
  , CastError = require('../schema').CastError;

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @api private
 */

function SchemaArray(key, cast) {
  SchemaType.call(this, key);
  this.caster = cast;
};

/**
 * Check required
 *
 * @api private
 */

SchemaArray.prototype.checkRequired = function (value) {
  return Array.isArray(value) && value.length;
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

SchemaArray.prototype.cast = function (value) {
  if (Array.isArray(value)){
    var caster = this.caster;
    if (caster)
      return value.map(function(v){
        try {
          return caster.prototype.cast.call(null, v);
        } catch(e){
          // rethrow
          throw new CastError(e.type, value);
        }
      });
    return value;
  }
  throw new CastError('array', value);
};

/**
 * Module exports.
 */

module.exports = SchemaArray;
