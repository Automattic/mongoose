
/**
 * Module dependencies.
 */

var BinaryParser = require('./binary_parser').BinaryParser;

/**
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don't bother.
 */

var MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);

/**
 * Constructor.
 *
 * @param {String} id (optional)
 */

function ObjectID (id) {
  if (null == id) {
    this.id = this.generate();
  } else if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return ObjectID.createFromHexString(id);
  } else {
    this.id = id;
  }
};

/**
 * Updates the ObjectID index.
 *
 * @return {Number}
 */

ObjectID.prototype.get_inc = function() {
  return ObjectID.index = (ObjectID.index + 1) % 0xFFFFFF;
};

/**
 * Generates an ObjectId.
 *
 * @return {String}
 */

ObjectID.prototype.generate = function() {
  var unixTime = parseInt(Date.now()/1000, 10);
  var time4Bytes = BinaryParser.encodeInt(unixTime, 32, true, true);
  var machine3Bytes = BinaryParser.encodeInt(MACHINE_ID, 24, false);
  var pid2Bytes = BinaryParser.fromShort(process.pid);
  var index3Bytes = BinaryParser.encodeInt(this.get_inc(), 24, false, true);
  return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
};

/**
 * Converts this ObjectId to a hex string.
 *
 * @return {String}
 */

ObjectID.prototype.toHexString = function() {
  var hexString = ''
    , number
    , value;

  for (var index = 0, len = this.id.length; index < len; index++) {
    value = BinaryParser.toByte(this.id.substr(index, 1));
    number = value <= 15
      ? '0' + value.toString(16)
      : value.toString(16);
    hexString = hexString + number;
  }

  return hexString;
};

/**
 * Converts this id to a string.
 *
 * @return {String}
 */

ObjectID.prototype.toString = function() {
  return this.toHexString();
};

/**
 * Converts to a string representation of this Id.
 */

ObjectID.prototype.inspect = ObjectID.prototype.toString;

/**
 * Converts to its JSON representation.
 */

ObjectID.prototype.toJSON = ObjectID.prototype.toString;

/**
 * Compares the equality of this ObjectID with `otherID`.
 *
 * @return {Bool}
 */

ObjectID.prototype.equals = function equals (otherID) {
  var id = (otherID instanceof ObjectID || otherID.toHexString)
    ? otherID.id
    : ObjectID.createFromHexString(otherID).id;

  return this.id === id;
}

/**
 * Returns the generation time in seconds that this
 * ID was generated.
 *
 * @return {Number}
 */

ObjectID.prototype.__defineGetter__("generationTime", function() {
  return BinaryParser.decodeInt(this.id.substring(0,4), 32, true, true) * 1000;
});

/**
 * Statics.
 */

ObjectID.index = 0;

ObjectID.createPk = function createPk () {
  return new ObjectID();
};

/**
 * Creates an ObjectID from a hex string representation
 * of an ObjectID.
 *
 * @param {String} hexString
 * @return {ObjectID}
 */

ObjectID.createFromHexString = function createFromHexString (hexString) {
  var len = hexString.length;

  if (len > 12*2) {
    throw new Error('Id cannot be longer than 12 bytes');
  }

  var result = ''
    , string
    , number;

  for (var index = 0; index < len; index += 2) {
    string = hexString.substr(index, 2);
    number = parseInt(string, 16);
    result += BinaryParser.fromByte(number);
  }

  return new ObjectID(result);
};

/**
 * Expose.
 */

exports.ObjectID = ObjectID;

