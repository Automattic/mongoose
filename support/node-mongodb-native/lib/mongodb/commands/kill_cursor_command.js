var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  BSON = require('../bson/bson').BSON,
  inherits = require('sys').inherits;

/**
  Insert Document Command
**/
var KillCursorCommand = exports.KillCursorCommand = function(cursorIds) {
  BaseCommand.call(this);

  this.cursorIds = cursorIds;
};

inherits(KillCursorCommand, BaseCommand);

KillCursorCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_KILL_CURSORS;
};

/*
struct {
    MsgHeader header;                 // standard message header
    int32     ZERO;                   // 0 - reserved for future use
    int32     numberOfCursorIDs;      // number of cursorIDs in message
    int64[]   cursorIDs;                // array of cursorIDs to close
}
*/
KillCursorCommand.prototype.getCommand = function() {
  // Generate the command string
  var command_string = BinaryParser.fromInt(0) + BinaryParser.fromInt(this.cursorIds.length);
  this.cursorIds.forEach(function(cursorId) {
    command_string = command_string + BSON.encodeLong(cursorId);
  });
  return command_string;
};