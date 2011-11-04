
/**
 * Access driver.
 */

var driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native';

/**
 * Module dependencies.
 */

var Binary = require(driver + '/binary');

/**
 * Mongoose Buffer constructor.
 * Values always have to be passed to the constructor to initialize, since
 * otherwise MongooseBuffer#push will mark the buffer as modified to the parent.
 *
 * @param {Buffer} value
 * @param {String} key path
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseBuffer (value, encode, offset) {
  var length = arguments.length;
  var val;

  if (0 === length || null === arguments[0] || undefined === arguments[0]) {
    val = 0;
  } else {
    val = value;
  }

  var encoding;
  var path;
  var doc;

  if (Array.isArray(encode)) {
    // internal casting
    path = encode[0];
    doc = encode[1];
  } else {
    encoding = encode;
  }

  var buf = new Buffer(val, encoding, offset);
  buf.__proto__ = MongooseBuffer.prototype;

  // make sure these internal props don't show up in Object.keys()
  Object.defineProperties(buf, {
      validators: { value: [] }
    , _path: { value: path }
    , _parent: { value: doc }
  });

  if (doc && "string" === typeof path) {
    Object.defineProperty(buf, '_schema', {
        value: doc.schema.path(path)
    });
  }

  return buf;
};

/**
 * Inherit from Buffer.
 */

MongooseBuffer.prototype = new Buffer(0);

/**
 * Parent owner document
 *
 * @api private
 */

MongooseBuffer.prototype._parent;


/**
* Marks this buffer as modified.
*
* @api public
*/

MongooseBuffer.prototype._markModified = function () {
  var parent = this._parent;

  if (parent) {
    parent.markModified(this._path);
  }
  return this;
};

/**
* Writes the buffer.
*/

MongooseBuffer.prototype.write = function () {
  var written = Buffer.prototype.write.apply(this, arguments);

  if (written > 0) {
    this._markModified();
  }

  return written;
};

/**
* Copy the buffer.
*
* Note: Buffer#copy will not mark target as modified so
* you must copy from a MongooseBuffer for it to work
* as expected.
*
* Work around since copy modifies the target, not this.
*/

MongooseBuffer.prototype.copy = function (target) {
  var ret = Buffer.prototype.copy.apply(this, arguments);

  if (target instanceof MongooseBuffer) {
    target._markModified();
  }

  return ret;
};

/**
 * Compile other Buffer methods marking this buffer as modified.
 */

;(
// node < 0.5
'writeUInt8 writeUInt16 writeUInt32 writeInt8 writeInt16 writeInt32 ' +
'writeFloat writeDouble fill ' +
'utf8Write binaryWrite asciiWrite set ' +

// node >= 0.5
'writeUInt16LE writeUInt16BE writeUInt32LE writeUInt32BE ' +
'writeInt16LE writeInt16BE writeInt32LE writeInt32BE ' +
'writeFloatLE writeFloatBE writeDoubleLE writeDoubleBE'
).split(' ').forEach(function (method) {
  if (!Buffer.prototype[method]) return;
  MongooseBuffer.prototype[method] = new Function(
    'var ret = Buffer.prototype.'+method+'.apply(this, arguments);' +
    'this._markModified();' +
    'return ret;'
  )
});

/**
 * Returns a Binary.
 *
 * @return {Buffer}
 * @api public
 */

MongooseBuffer.prototype.toObject = function () {
  return new Binary(this, 0x00);
};

/**
 * Module exports.
 */

MongooseBuffer.Binary = Binary;

module.exports = MongooseBuffer;
