var BaseCommand = require('./base_command').BaseCommand,
  inherits = require('util').inherits,
  debug = require('util').debug,
  inspect = require('util').inspect;

/**
  Insert Document Command
**/
var InsertCommand = exports.InsertCommand = function(db, collectionName, checkKeys) {
  BaseCommand.call(this);

  this.collectionName = collectionName;
  this.documents = [];
  this.checkKeys = checkKeys == null ? true : checkKeys;
  this.db = db;
};

inherits(InsertCommand, BaseCommand);

// OpCodes
InsertCommand.OP_INSERT =	2002;

InsertCommand.prototype.add = function(document) {
  this.documents.push(document);
  return this;
};

/*
struct {
    MsgHeader header;             // standard message header
    int32     ZERO;               // 0 - reserved for future use
    cstring   fullCollectionName; // "dbname.collectionname"
    BSON[]    documents;          // one or more documents to insert into the collection
}
*/
InsertCommand.prototype.toBinary = function() {
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + Buffer.byteLength(this.collectionName) + 1 + (4 * 4);
  // var docLength = 0
  for(var i = 0; i < this.documents.length; i++) {
    // Calculate size of document
    totalLengthOfCommand += this.db.bson_serializer.BSON.calculateObjectSize(this.documents[i]);
  }
    
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
  _command[_index + 3] = (InsertCommand.OP_INSERT >> 24) & 0xff;     
  _command[_index + 2] = (InsertCommand.OP_INSERT >> 16) & 0xff;
  _command[_index + 1] = (InsertCommand.OP_INSERT >> 8) & 0xff;
  _command[_index] = InsertCommand.OP_INSERT & 0xff;
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
  
  // Write all the bson documents to the buffer at the index offset
  for(var i = 0; i < this.documents.length; i++) {
    // Serialize the document straight to the buffer
    var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.documents[i], this.checkKeys, _command, _index) - _index + 1;
    // Write the length to the document
    _command[_index + 3] = (documentLength >> 24) & 0xff;     
    _command[_index + 2] = (documentLength >> 16) & 0xff;
    _command[_index + 1] = (documentLength >> 8) & 0xff;
    _command[_index] = documentLength & 0xff;
    // Update index in buffer
    _index = _index + documentLength;
    // Add terminating 0 for the object
    _command[_index - 1] = 0;    
  }
  
  return _command;
};
