var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits;

/**
  Insert Document Command
**/
var KillCursorCommand = exports.KillCursorCommand = function(db, cursorIds) {
  BaseCommand.call(this);

  this.cursorIds = cursorIds;
  this.db = db;
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
  var self = this;
  // Generate the command string
  var command_string = BinaryParser.fromInt(0) + BinaryParser.fromInt(this.cursorIds.length);
  this.cursorIds.forEach(function(cursorId) {
    command_string = command_string + self.db.bson_serializer.BSON.encodeLong(cursorId);
  });
  return command_string;
};