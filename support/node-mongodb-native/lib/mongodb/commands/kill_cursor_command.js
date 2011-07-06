var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits,
  binaryutils = require('../bson/binary_utils');

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
KillCursorCommand.prototype.getCommandAsBuffers = function(buffers) {
  var totalObjectLength = 4 + 4;
  // Push headers
  buffers.push(BaseCommand.encodeInt(0), BaseCommand.encodeInt(this.cursorIds.length));
  // Add all cursorids
  for(var i = 0; i < this.cursorIds.length; i++) {
    totalObjectLength += 8;

    var longBuffer = new Buffer(8);
    binaryutils.encodeIntInPlace(this.cursorIds[i], longBuffer, 0);
    binaryutils.encodeIntInPlace(this.cursorIds[i], longBuffer, 4);

    // Add values to buffer
    buffers.push(longBuffer);    
  }
  
  return totalObjectLength;
}