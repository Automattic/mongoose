
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = require('../schema').CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './../drivers/node-mongodb-native'
  , oid = require(driver + '/collection');

/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @api private
 */

function ObjectId (key) {
  SchemaType.call(this, key);
  this.default(function(){
    return new oid;
  });
};

/**
 * Inherits from SchemaType.
 */

ObjectId.prototype.__proto__ = ShemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

ObjectId.prototype.checkRequired = function(value){
  return value && value instanceof oid;
};

/**
 * Casts to String 
 *
 * @api private
 */

ObjectId.prototype.cast = function (value) {
  if (value instanceof oid)
    return oid;
  if (value.toString)
    return oid.fromString(value.toString());
  throw new CastError('object id', value);
};

/**
 * Module exports.
 */

module.exports = ObjectId;
