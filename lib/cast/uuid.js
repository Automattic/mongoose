'use strict';

const MongooseBuffer = require('../types/buffer');

const UUID_FORMAT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const Binary = MongooseBuffer.Binary;

module.exports = function castUUID(value) {
  if (value == null) {
    return value;
  }

  function newBuffer(initbuff) {
    const buff = new MongooseBuffer(initbuff);
    buff._subtype = 4;
    return buff;
  }

  if (typeof value === 'string') {
    if (UUID_FORMAT.test(value)) {
      return stringToBinary(value);
    } else {
      throw new Error(`"${value}" is not a valid UUID string`);
    }
  }

  if (Buffer.isBuffer(value)) {
    return newBuffer(value);
  }

  if (value instanceof Binary) {
    return newBuffer(value.value(true));
  }

  // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
  // **unless** its the default Object.toString, because "[object Object]"
  // doesn't really qualify as useful data
  if (value.toString && value.toString !== Object.prototype.toString) {
    if (UUID_FORMAT.test(value.toString())) {
      return stringToBinary(value.toString());
    }
  }

  throw new Error(`"${value}" cannot be casted to a UUID`);
};

module.exports.UUID_FORMAT = UUID_FORMAT;

/**
 * Helper function to convert the input hex-string to a buffer
 * @param {String} hex The hex string to convert
 * @returns {Buffer} The hex as buffer
 * @api private
 */

function hex2buffer(hex) {
  // use buffer built-in function to convert from hex-string to buffer
  const buff = hex != null && Buffer.from(hex, 'hex');
  return buff;
}

/**
 * Convert a String to Binary
 * @param {String} uuidStr The value to process
 * @returns {MongooseBuffer} The binary to store
 * @api private
 */

function stringToBinary(uuidStr) {
  // Protect against undefined & throwing err
  if (typeof uuidStr !== 'string') uuidStr = '';
  const hex = uuidStr.replace(/[{}-]/g, ''); // remove extra characters
  const bytes = hex2buffer(hex);
  const buff = new MongooseBuffer(bytes);
  buff._subtype = 4;

  return buff;
}
