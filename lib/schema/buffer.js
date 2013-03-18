/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , MongooseBuffer = require('../types').Buffer
  , Binary = MongooseBuffer.Binary
  , Query = require('../query')
  , utils = require('../utils')
  , Document

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @inherits SchemaType
 * @api private
 */

function SchemaBuffer (key, options) {
  SchemaType.call(this, key, options, 'Buffer');
};

/*!
 * Inherits from SchemaType.
 */

SchemaBuffer.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

SchemaBuffer.prototype.checkRequired = function (value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return null != value;
  } else {
    return !!(value && value.length);
  }
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaBuffer.prototype.cast = function (value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document || null == value) {
      return value;
    }

    // setting a populated path
    if (Buffer.isBuffer(value)) {
      return value;
    } else if (!utils.isObject(value)) {
      throw new CastError('buffer', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = new pop.options.model(value);
    return ret;
  }

  // documents
  if (value && value._id) {
    value = value._id;
  }

  if (Buffer.isBuffer(value)) {
    if (!(value instanceof MongooseBuffer)) {
      value = new MongooseBuffer(value, [this.path, doc]);
    }

    return value;
  } else if (value instanceof Binary) {
    return new MongooseBuffer(value.value(true), [this.path, doc]);
  }

  if (null === value) return value;

  var type = typeof value;
  if ('string' == type || 'number' == type || Array.isArray(value)) {
    return new MongooseBuffer(value, [this.path, doc]);
  }

  throw new CastError('buffer', value, this.path);
};

/*!
 * ignore
 */
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

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

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

/*!
 * Module exports.
 */

module.exports = SchemaBuffer;
