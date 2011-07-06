var BinaryParser = require('../bson/binary_parser').BinaryParser,
  debug = require('util').debug,
  inspect = require('util').inspect;

/**
  Base object used for common functionality
**/
var BaseCommand = exports.BaseCommand = function() {
};

BaseCommand.prototype.toBinary = function() {
  if(this instanceof require('./insert_command').InsertCommand || 
    this instanceof require('./query_command').QueryCommand ||
    this instanceof require('./update_command').UpdateCommand ||
    this instanceof require('./delete_command').DeleteCommand ||
    this instanceof require('./get_more_command').GetMoreCommand ||
    this instanceof require('./kill_cursor_command').KillCursorCommand) {
  
    // Build list of Buffer objects to write out
    var buffers = [];
  
    // Get the command op code
    var op_code = this.getOpCode();
    var commandBuffers = [];
  
    // Get the command data structure
    var commandLength = this.getCommandAsBuffers(commandBuffers);
    // Total Size of command
    var totalSize = 4*4 + commandLength;
    // Encode totalSize, requestId, responseId and opcode
    buffers.push(BaseCommand.encodeInt(totalSize), BaseCommand.encodeInt(this.requestId), BaseCommand.encodeInt(0), BaseCommand.encodeInt(op_code));
    
    // Add the command items
    buffers = buffers.concat(commandBuffers);
    // Allocate single buffer for write
    var finalBuffer = new Buffer(totalSize);
    
    var index = 0;
  
    for(var i = 0; i < buffers.length; i++) {
      buffers[i].copy(finalBuffer, index);
      index = index + buffers[i].length;
    }
    
    return finalBuffer;
  };
  
  // Get the command op code
  var op_code = this.getOpCode();
  // Get the command data structure
  var command = this.getCommand();
  // Total Size of command
  var totalSize = 4*4 + command.length;
  // Create the command with the standard header file
  return BinaryParser.fromInt(totalSize) + BinaryParser.fromInt(this.requestId) + BinaryParser.fromInt(0) + BinaryParser.fromInt(op_code) + command;
};

var id = 1;
BaseCommand.prototype.getRequestId = function() {
  if (!this.requestId) this.requestId = id++;
  return this.requestId;
};

// OpCodes
BaseCommand.OP_REPLY = 1;
BaseCommand.OP_MSG = 1000;
BaseCommand.OP_UPDATE = 2001;
BaseCommand.OP_INSERT =	2002;
BaseCommand.OP_GET_BY_OID = 2003;
BaseCommand.OP_QUERY = 2004;
BaseCommand.OP_GET_MORE = 2005;
BaseCommand.OP_DELETE =	2006;
BaseCommand.OP_KILL_CURSORS =	2007;

BaseCommand.encodeInt = function(value) {
  var buffer = new Buffer(4);
  buffer[3] = (value >> 24) & 0xff;      
  buffer[2] = (value >> 16) & 0xff;
  buffer[1] = (value >> 8) & 0xff;
  buffer[0] = value & 0xff;
  return buffer;
}

BaseCommand.encodeIntInPlace = function(value, buffer, index) {
  buffer[index + 3] = (value >> 24) & 0xff;			
	buffer[index + 2] = (value >> 16) & 0xff;
	buffer[index + 1] = (value >> 8) & 0xff;
	buffer[index] = value & 0xff;
}

BaseCommand.encodeCString = function(string) {
  var buf = new Buffer(string, 'utf8');
  return [buf, new Buffer([0])];
}

