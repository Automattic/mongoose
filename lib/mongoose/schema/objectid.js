
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './../drivers/node-mongodb-native'
  , oid = require('../types/objectid');


/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @api private
 */

function ObjectId (key, options) {
  SchemaType.call(this, key, options);

  this.default(function(){
    return new oid();
  });
};

/**
 * Inherits from SchemaType.
 */

ObjectId.prototype.__proto__ = SchemaType.prototype;

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
    return value;
  if (value.toString)
    return oid.fromString(value.toString());
  throw new CastError('object id', value);
};

/**
 * Module exports.
 */

module.exports = ObjectId;
