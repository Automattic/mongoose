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
InsertCommand.prototype.getCommand = function() {
  var command_string = '';
  for(var i = 0; i < this.documents.length; i++) {    
    command_string = command_string + this.db.bson_serializer.BSON.serialize(this.documents[i], this.checkKeys);
  }
  // Build the command string
  return BinaryParser.fromInt(0) + BinaryParser.encode_cstring(this.collectionName) + command_string;
};