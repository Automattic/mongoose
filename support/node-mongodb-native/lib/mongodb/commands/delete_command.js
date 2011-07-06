var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits;

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

DeleteCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_DELETE;
};

/*
struct {
    MsgHeader header;                 // standard message header
    int32     ZERO;                   // 0 - reserved for future use
    cstring   fullCollectionName;     // "dbname.collectionname"
    int32     ZERO;                   // 0 - reserved for future use
    mongo.BSON      selector;               // query object.  See below for details.
}
*/
DeleteCommand.prototype.getCommandAsBuffers = function(buffers) {
  var collectionNameBuffers = BaseCommand.encodeCString(this.collectionName);
  var totalObjectLength = 4 + 4 + collectionNameBuffers[0].length + 1;
  // Long command for cursor
  var selectorCommand = this.db.bson_serializer.BSON.serialize(this.selector, false, true);
  totalObjectLength += selectorCommand.length;
  // Push headers
  buffers.push(BaseCommand.encodeInt(0), collectionNameBuffers[0], collectionNameBuffers[1], BaseCommand.encodeInt(0), selectorCommand);
  return totalObjectLength;
}