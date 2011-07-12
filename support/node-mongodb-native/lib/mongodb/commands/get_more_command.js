var BaseCommand = require('./base_command').BaseCommand,
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

GetMoreCommand.OP_GET_MORE = 2005;

GetMoreCommand.prototype.toBinary = function() {
  // debug("======================================================= GETMORE")
  // debug("================ " + this.db.bson_serializer.BSON.calculateObjectSize(this.query))
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + Buffer.byteLength(this.collectionName) + 1 + 4 + 8 + (4 * 4);
  // Let's build the single pass buffer command
  var _index = 0;
  var _command = new Buffer(totalLengthOfCommand);
  // Write the header information to the buffer
  _command[_index + 3] = (totalLengthOfCommand >> 24) & 0xff;     
  _command[_index + 2] = (totalLengthOfCommand >> 16) & 0xff;
  _command[_index + 1] = (totalLengthOfCommand >> 8) & 0xff;
  _command[_index] = totalLengthOfCommand & 0xff;
  // Adjust index
  _index = _index + 4;
  // Write the request ID
  _command[_index + 3] = (this.requestId >> 24) & 0xff;     
  _command[_index + 2] = (this.requestId >> 16) & 0xff;
  _command[_index + 1] = (this.requestId >> 8) & 0xff;
  _command[_index] = this.requestId & 0xff;
  // Adjust index
  _index = _index + 4;
  // Write zero
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  // Write the op_code for the command
  _command[_index + 3] = (GetMoreCommand.OP_GET_MORE >> 24) & 0xff;     
  _command[_index + 2] = (GetMoreCommand.OP_GET_MORE >> 16) & 0xff;
  _command[_index + 1] = (GetMoreCommand.OP_GET_MORE >> 8) & 0xff;
  _command[_index] = GetMoreCommand.OP_GET_MORE & 0xff;
  // Adjust index
  _index = _index + 4;

  // Write zero
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;

  // Write the collection name to the command
  _index = _index + _command.write(this.collectionName, _index, 'utf8') + 1;
  _command[_index - 1] = 0;    

  // Number of documents to return
  _command[_index + 3] = (this.numberToReturn >> 24) & 0xff;     
  _command[_index + 2] = (this.numberToReturn >> 16) & 0xff;
  _command[_index + 1] = (this.numberToReturn >> 8) & 0xff;
  _command[_index] = this.numberToReturn & 0xff;
  // Adjust index
  _index = _index + 4;
  
  // Encode the cursor id
  var low_bits = this.cursorId.getLowBits();
  // Encode low bits
  _command[_index + 3] = (low_bits >> 24) & 0xff;     
  _command[_index + 2] = (low_bits >> 16) & 0xff;
  _command[_index + 1] = (low_bits >> 8) & 0xff;
  _command[_index] = low_bits & 0xff;
  // Adjust index
  _index = _index + 4;
  
  var high_bits = this.cursorId.getHighBits();
  // Encode high bits
  _command[_index + 3] = (high_bits >> 24) & 0xff;     
  _command[_index + 2] = (high_bits >> 16) & 0xff;
  _command[_index + 1] = (high_bits >> 8) & 0xff;
  _command[_index] = high_bits & 0xff;
  // Adjust index
  _index = _index + 4;
  
  return _command;
};