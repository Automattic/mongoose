var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
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

InsertCommand.prototype.add = function(document) {
  this.documents.push(document);
  return this;
};

InsertCommand.prototype.getOpCode = function() {  
  return BaseCommand.OP_INSERT;
};

/*
struct {
    MsgHeader header;             // standard message header
    int32     ZERO;               // 0 - reserved for future use
    cstring   fullCollectionName; // "dbname.collectionname"
    BSON[]    documents;          // one or more documents to insert into the collection
}
*/
InsertCommand.prototype.getCommandAsBuffers = function(buffers) {
  var collectionNameBuffers = BaseCommand.encodeCString(this.collectionName);
  // Add command to buffers
  buffers.push(BaseCommand.encodeInt(0), collectionNameBuffers[0], collectionNameBuffers[1]);  
  // Basic command length
  var commandLength = 4 + collectionNameBuffers[0].length + 1;

  for(var i = 0; i < this.documents.length; i++) {
    var command = this.db.bson_serializer.BSON.serialize(this.documents[i], this.checkKeys, true);
    commandLength += command.length;
    buffers.push(command);
  }
  
  return commandLength;
}




