
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './../drivers/node-mongodb-native'
  , dbref = require('../types/dbref')
  , oid = require('./objectid');

/**
 * DBRef SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @api private
 */

function DBRef (key, options) {
  SchemaType.call(this, key, options);
};

/**
 * Inherits from SchemaType.
 */

DBRef.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

DBRef.prototype.checkRequired = function (value) {
  return !!value && value instanceof dbref;
};

/**
 * Casts to object
 *
 * @api private
 */

DBRef.prototype.cast = function (value) {
  if (value === null) return value;

  if (value instanceof dbref)
    return value;

  if (typeof value !== 'object')
    throw new CastError('db reference', value);

  if (value._id === null)
    return new dbref(value.collection.name, value._id, value.db.name);

  return new dbref(value["$ref"], oid.prototype.cast(value["$id"]), value["$db"]);
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

DBRef.prototype.$conditionalHandlers = {
    '$ne': handleSingle
  , '$in': handleArray
  , '$nin': handleArray
};
DBRef.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with DBRef.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    return this.cast(val);
  }
};

/**
 * Module exports.
 */

module.exports = DBRef;
