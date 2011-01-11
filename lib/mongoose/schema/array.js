
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , Types = require('./');

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @api private
 */

function SchemaArray(key, cast, options) {
  SchemaType.call(this, key, options);
  if (cast)
    this.caster = Types[cast.name];
};

/**
 * Inherits from SchemaType.
 */

SchemaArray.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

SchemaArray.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

SchemaArray.prototype.cast = function (value) {
  if (value.map && 'length' in value){
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
