
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

ObjectId.prototype.checkRequired = function (value) {
  return !!value && value instanceof oid;
};

/**
 * Casts to String 
 *
 * @api private
 */

ObjectId.prototype.cast = function (value) {
  if (value === null) return value;

  if (value instanceof oid)
    return value;

  if (value._id && value._id instanceof oid)
    value = value._id;

  if (value.toString)
    return oid.fromString(value.toString());

  throw new CastError('object id', value);
};

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.cast(m);
  });
}

ObjectId.prototype.$conditionalHandlers = {
    '$ne': handleSingle
  , '$in': handleArray
  , '$nin': handleArray
};
ObjectId.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with ObjectId.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    return this.cast(val);
  }
};

/**
 * Adds an auto-generated ObjectId default if turnOn is true.
 * @param {Boolean} turnOn auto generated ObjectId defaults
 * @api private
 */
ObjectId.prototype.auto = function (turnOn) {
  if (turnOn) {
    this.default(function(){
      return new oid();
    });
  }
};

/**
 * Module exports.
 */

module.exports = ObjectId;
