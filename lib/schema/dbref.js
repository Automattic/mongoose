/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './../drivers/node-mongodb-native'
  , oid = require('../types/objectid');
var dbref = require('mongodb').BSONPure.DBRef;
var utils = require('../utils');

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
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

DBRef.prototype.applyGetters = function (value, scope) {
  if (this.options.ref && value && value._id && value._id instanceof oid) {
    // means the dbref was populated
    return value;
  }
  
  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

DBRef.prototype.applySetters = function (value, scope) {
  if (this.options.ref && value && value._id && value._id instanceof oid) {
    // means the dbref was populated
    return value;
  }
  
  return SchemaType.prototype.applySetters.call(this, value, scope);
};

/**
 * Casts to DBRef
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} whether this is an initialization cast
 * @api private
 */

DBRef.prototype.cast = function (value, scope, init) {
  if (this.options
    && this.options.ref
    && init
    && value && value._id && value._id instanceof oid) {
    return value;
  }
  
  if (value === null)
    return value;

  if (value && value instanceof dbref) {
    return value;
  }

  if (value && value instanceof oid) {
    return new dbref(utils.toCollectionName(this.options.ref),
      value,
      mongoose.connection.name);
  }

  if (typeof value == 'string') {
    return new dbref(utils.toCollectionName(this.options.ref),
      oid.fromString(value),
      mongoose.connection.name);
  }

  if (value && value._id instanceof oid) {
    return new dbref(value.collection.name,
      value._id,
      mongoose.connection.name);
  }

  if (this.options.ref && value && value.$id && value.$id instanceof oid && value.$ref) {
    return value;
  }

  throw new CastError('db ref', value);
};

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.cast(m);
  });
}

DBRef.prototype.$conditionalHandlers = {
    '$ne': handleSingle
  , '$in': handleArray
  , '$nin': handleArray
  , '$gt': handleSingle
  , '$lt': handleSingle
  , '$gte': handleSingle
  , '$lte': handleSingle
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
 * Adds an auto-generated DBRef default if turnOn is true.
 * @param {Boolean} turnOn auto generated DBRef defaults
 * @api private
 */
DBRef.prototype.auto = function (turnOn) {
  if (turnOn) {
    this.default(function(){
      return new dbref(utils.toCollectionName(this.options.ref),
        new oid(),
        mongoose.connection.name);
    });
  }
};

/**
 * Module exports.
 */

module.exports = DBRef;