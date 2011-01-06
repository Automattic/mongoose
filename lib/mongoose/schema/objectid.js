
/**
 * Module dependencies.
 */

var SchemaType = require('./../type').SchemaType
  , CastError = require('./../type').CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
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
 * Casts to String 
 *
 * @api private
 */

ObjectId.prototype.cast = function (value) {
  if (typeof value == 'string')
    return oid.fromString(value);
  throw new CastError('object id', value);
};

/**
 * Module exports.
 */

module.exports = ObjectId;
