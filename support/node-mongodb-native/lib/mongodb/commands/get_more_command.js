var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  BSON = require('../bson/bson').BSON,
  inherits = require('sys').inherits;

/**
  Get More Document Command
**/
var GetMoreCommand = exports.GetMoreCommand = function(collectionName, numberToReturn, cursorId) {
  BaseCommand.call(this);

  this.collectionName = collectionName;
  this.numberToReturn = numberToReturn;
  this.cursorId = cursorId;
};

inherits(GetMoreCommand, BaseCommand);

GetMoreCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_GET_MORE;
};

GetMoreCommand.prototype.getCommand = function() {
  // Generate the command string
  return BinaryParser.fromInt(0) + BinaryParser.encode_cstring(this.collectionName) + BinaryParser.fromInt(this.numberToReturn) + BSON.encodeLong(this.cursorId);
};