var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits,
  debug = require('util').debug,
  inspect = require('util').inspect,
  binaryutils = require('../bson/binary_utils');

/**
  Get More Document Command
**/
var GetMoreCommand = exports.GetMoreCommand = function(db, collectionName, numberToReturn, cursorId) {
  BaseCommand.call(this);

  this.collectionName = collectionName;
  this.numberToReturn = numberToReturn;
  this.cursorId = cursorId;
  this.db = db;
};

inherits(GetMoreCommand, BaseCommand);

GetMoreCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_GET_MORE;
};

GetMoreCommand.prototype.getCommandAsBuffers = function(buffers) {
  var collectionNameBuffers = BaseCommand.encodeCString(this.collectionName);
  var totalObjectLength = 4 + 4 + collectionNameBuffers[0].length + 1 + 8;
  
  // Push headers
  buffers.push(BaseCommand.encodeInt(0), collectionNameBuffers[0], collectionNameBuffers[1], BaseCommand.encodeInt(this.numberToReturn));

  var longBuffer = new Buffer(8);
  binaryutils.encodeIntInPlace(this.cursorId.getLowBits(), longBuffer, 0);
  binaryutils.encodeIntInPlace(this.cursorId.getHighBits(), longBuffer, 4);

  // Add values to buffer
  buffers.push(longBuffer);
  // Return total value
  return totalObjectLength;
}