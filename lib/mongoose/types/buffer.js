
/**
 * Access driver.
 */

var driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native';

/**
 * Module dependencies.
 */

var EmbeddedDocument = require('./document');
var ObjectId = require('./objectid');
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

function MongooseBuffer (value, path, doc) {
  if (!value) {
    value = new Buffer(0);
  }
  var buf = new Buffer(value);
  buf.__proto__ = MongooseBuffer.prototype;

  // make sure these internal props don't show up in Object.keys()
  Object.defineProperties(buf, {
      validators: { value: [] }
    , _path: { value: path }
    , _parent: { value: doc }
  });

  if (doc) {
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
 * Splices the buffer.
 */

MongooseBuffer.prototype.splice = function () {
  Buffer.prototype.splice.apply(this, arguments);
  this._markModified();
  return this;
};

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
 * Helper for console.log
 *
 * @api public
 */

MongooseBuffer.prototype.inspect = function () {
  return Buffer.prototype.inspect.apply(this);
};


/**
 * Module exports.
 */

MongooseBuffer.Binary = Binary;

module.exports = MongooseBuffer;
