var BaseCommand = require('./base_command').BaseCommand,
  inherits = require('util').inherits,
  debug = require('util').debug, 
  inspect = require('util').inspect;

/**
  Insert Document Command
**/
var DeleteCommand = exports.DeleteCommand = function(db, collectionName, selector) {
  BaseCommand.call(this);
  
  this.collectionName = collectionName;
  this.selector = selector;
  this.db = db;
};

inherits(DeleteCommand, BaseCommand);

DeleteCommand.OP_DELETE =	2006;

/*
struct {
    MsgHeader header;                 // standard message header
    int32     ZERO;                   // 0 - reserved for future use
    cstring   fullCollectionName;     // "dbname.collectionname"
    int32     ZERO;                   // 0 - reserved for future use
    mongo.BSON      selector;               // query object.  See below for details.
}
*/
DeleteCommand.prototype.toBinary = function() {
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + Buffer.byteLength(this.collectionName) + 1 + 4 + this.db.bson_serializer.BSON.calculateObjectSize(this.selector) + (4 * 4);
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
  _command[_index + 3] = (DeleteCommand.OP_DELETE >> 24) & 0xff;     
  _command[_index + 2] = (DeleteCommand.OP_DELETE >> 16) & 0xff;
  _command[_index + 1] = (DeleteCommand.OP_DELETE >> 8) & 0xff;
  _command[_index] = DeleteCommand.OP_DELETE & 0xff;
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

  // Write zero
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  _command[_index++] = 0;
  
  // Serialize the selector
  var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.selector, this.checkKeys, _command, _index) - _index + 1;
  // Write the length to the document
  _command[_index + 3] = (documentLength >> 24) & 0xff;     
  _command[_index + 2] = (documentLength >> 16) & 0xff;
  _command[_index + 1] = (documentLength >> 8) & 0xff;
  _command[_index] = documentLength & 0xff;
  // Update index in buffer
  _index = _index + documentLength;
  // Add terminating 0 for the object
  _command[_index - 1] = 0;      
  return _command;
};