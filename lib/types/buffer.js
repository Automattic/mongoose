/*!
 * Module dependencies.
 */

'use strict';

const Binary = require('../driver').get().Binary;
const utils = require('../utils');
const Buffer = require('safe-buffer').Buffer;

// Yes this is weird. See https://github.com/feross/safe-buffer/pull/23
const proto = Buffer.from('').constructor.prototype;

/**
 * Mongoose Buffer constructor.
 *
 * Values always have to be passed to the constructor to initialize.
 *
 * @param {Buffer} value
 * @param {String} encode
 * @param {Number} offset
 * @api private
 * @inherits Buffer
 * @see http://bit.ly/f6CnZU
 */

function MongooseBuffer(value, encode, offset) {
  const length = arguments.length;
  let val;

  if (length === 0 || arguments[0] === null || arguments[0] === undefined) {
    val = 0;
  } else {
    val = value;
  }

  let encoding;
  let path;
  let doc;

  if (Array.isArray(encode)) {
    // internal casting
    path = encode[0];
    doc = encode[1];
  } else {
    encoding = encode;
  }

  let buf;
  if (typeof val === 'number' || val instanceof Number) {
    buf = Buffer.alloc(val);
  } else { // string, array or object { type: 'Buffer', data: [...] }
    buf = Buffer.from(val, encoding, offset);
  }
  utils.decorate(buf, MongooseBuffer.mixin);
  buf.isMongooseBuffer = true;

  // make sure these internal props don't show up in Object.keys()
  Object.defineProperties(buf, {
    validators: {
      value: [],
      enumerable: false
    },
    _path: {
      value: path,
      enumerable: false
    },
    _parent: {
      value: doc,
      enumerable: false
    }
  });

  if (doc && typeof path === 'string') {
    Object.defineProperty(buf, '_schema', {
      value: doc.schema.path(path)
    });
  }

  buf._subtype = 0;
  return buf;
}

/*!
 * Inherit from Buffer.
 */

// MongooseBuffer.prototype = Buffer.alloc(0);

MongooseBuffer.mixin = {

  /**
   * Parent owner document
   *
   * @api private
   * @property _parent
   * @receiver MongooseBuffer
   */

  _parent: undefined,

  /**
   * Default subtype for the Binary representing this Buffer
   *
   * @api private
   * @property _subtype
   * @receiver MongooseBuffer
   */

  _subtype: undefined,

  /**
   * Marks this buffer as modified.
   *
   * @api private
   * @method _markModified
   * @receiver MongooseBuffer
   */

  _markModified: function() {
    const parent = this._parent;

    if (parent) {
      parent.markModified(this._path);
    }
    return this;
  },

  /**
   * Writes the buffer.
   *
   * @api public
   * @method write
   * @receiver MongooseBuffer
   */

  write: function() {
    const written = proto.write.apply(this, arguments);

    if (written > 0) {
      this._markModified();
    }

    return written;
  },

  /**
   * Copies the buffer.
   *
   * ####Note:
   *
   * `Buffer#copy` does not mark `target` as modified so you must copy from a `MongooseBuffer` for it to work as expected. This is a work around since `copy` modifies the target, not this.
   *
   * @return {Number} The number of bytes copied.
   * @param {Buffer} target
   * @method copy
   * @receiver MongooseBuffer
   */

  copy: function(target) {
    const ret = proto.copy.apply(this, arguments);

    if (target && target.isMongooseBuffer) {
      target._markModified();
    }

    return ret;
  }
};

/*!
 * Compile other Buffer methods marking this buffer as modified.
 */

(
// node < 0.5
  ('writeUInt8 writeUInt16 writeUInt32 writeInt8 writeInt16 writeInt32 ' +
    'writeFloat writeDouble fill ' +
    'utf8Write binaryWrite asciiWrite set ' +

  // node >= 0.5
    'writeUInt16LE writeUInt16BE writeUInt32LE writeUInt32BE ' +
    'writeInt16LE writeInt16BE writeInt32LE writeInt32BE ' + 'writeFloatLE writeFloatBE writeDoubleLE writeDoubleBE')
).split(' ').forEach(function(method) {
  if (!proto[method]) {
    return;
  }
  MongooseBuffer.mixin[method] = function() {
    const ret = proto[method].apply(this, arguments);
    this._markModified();
    return ret;
  };
});

/**
 * Converts this buffer to its Binary type representation.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.toObject(bson.BSON_BINARY_SUBTYPE_USER_DEFINED);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} [subtype]
 * @return {Binary}
 * @api public
 * @method toObject
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.toObject = function(options) {
  const subtype = typeof options === 'number'
    ? options
    : (this._subtype || 0);
  return new Binary(this, subtype);
};

/**
 * Converts this buffer for storage in MongoDB, including subtype
 *
 * @return {Binary}
 * @api public
 * @method toBSON
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.toBSON = function() {
  return new Binary(this, this._subtype || 0);
};

/**
 * Determines if this buffer is equals to `other` buffer
 *
 * @param {Buffer} other
 * @return {Boolean}
 * @method equals
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.equals = function(other) {
  if (!Buffer.isBuffer(other)) {
    return false;
  }

  if (this.length !== other.length) {
    return false;
  }

  for (let i = 0; i < this.length; ++i) {
    if (this[i] !== other[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Sets the subtype option and marks the buffer modified.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.subtype(bson.BSON_BINARY_SUBTYPE_UUID);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} subtype
 * @api public
 * @method subtype
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.subtype = function(subtype) {
  if (typeof subtype !== 'number') {
    throw new TypeError('Invalid subtype. Expected a number');
  }

  if (this._subtype !== subtype) {
    this._markModified();
  }

  this._subtype = subtype;
};

/*!
 * Module exports.
 */

MongooseBuffer.Binary = Binary;

module.exports = MongooseBuffer;
