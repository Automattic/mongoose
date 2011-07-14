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

  var self = this
    , defaultBuf
    , fn;

  if (this.defaultValue) {
    defaultBuf = this.defaultValue;
    fn = 'function' == typeof defaultBuf;
  }

  this.default(function(){
    var buf = fn ? defaultBuf() : defaultBuf || null;
    return new MongooseBuffer(buf, self.path, this);
  });
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
      value = new MongooseBuffer(value, this.path, doc);
    }

    return value;
  } else if (value instanceof Binary) {
    return value.value(true);
  }

  throw new CastError('buffer', value);
};

SchemaBuffer.prototype.$conditionalHandlers = {
    '$ne': function (val) {
      return this.castForQuery(val);
    }
  , '$in': function (val) {
      return this.castForQuery(val);
    }
  , '$nin': function (val) {
      return this.castForQuery(val);
    }
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
