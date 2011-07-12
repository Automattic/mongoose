var BaseCommand = require('./base_command').BaseCommand,
  inherits = require('util').inherits,
  binaryutils = require('../bson/binary_utils'),
  debug = require('util').debug,
  inspect = require('util').inspect;

/**
  Insert Document Command
**/
var KillCursorCommand = exports.KillCursorCommand = function(db, cursorIds) {
  BaseCommand.call(this);

  this.cursorIds = cursorIds;
  this.db = db;
};

inherits(KillCursorCommand, BaseCommand);

KillCursorCommand.OP_KILL_CURSORS = 2007;

/*
struct {
    MsgHeader header;                 // standard message header
    int32     ZERO;                   // 0 - reserved for future use
    int32     numberOfCursorIDs;      // number of cursorIDs in message
    int64[]   cursorIDs;                // array of cursorIDs to close
}
*/
KillCursorCommand.prototype.toBinary = function() {
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + 4 + (4 * 4) + (this.cursorIds.length * 8);
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
  _command[_index + 3] = (KillCursorCommand.OP_KILL_CURSORS >> 24) & 0xff;     
  _command[_index + 2] = (KillCursorCommand.OP_KILL_CURSORS >> 16) & 0xff;
  _command[_index + 1] = (KillCursorCommand.OP_KILL_CURSORS >> 8) & 0xff;
  _command[_index] = KillCursorCommand.OP_KILL_CURSORS & 0xff;
  // Adjust index
  _index = _index + 4;

  // Write zero
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;

  // Number of cursors to kill
  var numberOfCursors = this.cursorIds.length;
  _command[_index + 3] = (numberOfCursors >> 24) & 0xff;     
  _command[_index + 2] = (numberOfCursors >> 16) & 0xff;
  _command[_index + 1] = (numberOfCursors >> 8) & 0xff;
  _command[_index] = numberOfCursors & 0xff;
  // Adjust index
  _index = _index + 4;

  // Encode all the cursors
  for(var i = 0; i < this.cursorIds.length; i++) {
    // Encode the cursor id
    var low_bits = this.cursorIds[i].getLowBits();
    // Encode low bits
    _command[_index + 3] = (low_bits >> 24) & 0xff;     
    _command[_index + 2] = (low_bits >> 16) & 0xff;
    _command[_index + 1] = (low_bits >> 8) & 0xff;
    _command[_index] = low_bits & 0xff;
    // Adjust index
    _index = _index + 4;
      
    var high_bits = this.cursorIds[i].getHighBits();
    // Encode high bits
    _command[_index + 3] = (high_bits >> 24) & 0xff;     
    _command[_index + 2] = (high_bits >> 16) & 0xff;
    _command[_index + 1] = (high_bits >> 8) & 0xff;
    _command[_index] = high_bits & 0xff;
    // Adjust index
    _index = _index + 4;
  }
  
  return _command;
};