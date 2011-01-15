
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , Types = {
        Boolean: require('./boolean')
      , Date: require('./date')
      , Number: require('./number')
      , String: require('./string')
      , ObjectId: require('./objectid')
    }
  , MongooseArray = require('../types').Array;

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @api private
 */

function SchemaArray (key, cast, options) {
  SchemaType.call(this, key, options);
  if (cast)
    this.caster = cast.name in Types ? Types[cast.name] : cast;
};

/**
 * Inherits from SchemaType.
 */

SchemaArray.prototype.__proto__ = SchemaType.prototype;

/**
 * Returns init value
 *
 * @api private
 */

SchemaArray.prototype.initValue = function () {
  return new MongooseArray();
};

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
  if (Array.isArray(value)){
    if (!(value instanceof MongooseArray))
      value = new MongooseArray(value);

    var caster = this.caster;

    if (caster)
      for (var i = 0, l = value.length; i < l; i++){
        try {
          value[i] = caster.prototype.cast.call(null, value[i]);
        } catch(e){
          // rethrow
          throw new CastError(e.type, value);
        }
      };

    return value;
  }

  throw new CastError('array', value, caster);
};

/**
 * Module exports.
 */

module.exports = SchemaArray;
