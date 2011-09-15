/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , BufferNumberSchema = function () {}
  , MongooseBuffer = require('../types').Buffer
  , Binary = MongooseBuffer.Binary
  , Query = require('../query');

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @api private
 */

function SchemaBuffer (key, options) {
  SchemaType.call(this, key, options);
};

/**
 * Inherits from SchemaType.
 */

SchemaBuffer.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

SchemaBuffer.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

SchemaBuffer.prototype.cast = function (value, doc) {
  if (Buffer.isBuffer(value)) {
    if (!(value instanceof MongooseBuffer)) {
      value = new MongooseBuffer(value, [this.path, doc]);
    }

    return value;
  } else if (value instanceof Binary) {
    return new MongooseBuffer(value.value(true), [this.path, doc]);
  }

  if ('string' === typeof value || Array.isArray(value)) {
    return new MongooseBuffer(value, [this.path, doc]);
  }

  throw new CastError('buffer', value);
};

function handleSingle (val) {
  return this.castForQuery(val);
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.castForQuery(m);
  });
}

SchemaBuffer.prototype.$conditionalHandlers = {
    '$ne' : handleSingle
  , '$in' : handleArray
  , '$nin': handleArray
  , '$gt' : handleSingle
  , '$lt' : handleSingle
  , '$gte': handleSingle
  , '$lte': handleSingle
};

SchemaBuffer.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with Buffer.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    return this.cast(val).toObject();
  }
};

/**
 * Module exports.
 */

module.exports = SchemaBuffer;
