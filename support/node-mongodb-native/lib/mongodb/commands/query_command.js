var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits,
  debug = require('util').debug,
  inspect = require('util').inspect;

/**
  Insert Document Command
**/
var QueryCommand = exports.QueryCommand = function(db, collectionName, queryOptions, numberToSkip, numberToReturn, query, returnFieldSelector) {
  BaseCommand.call(this);
  
  this.collectionName = collectionName;
  this.queryOptions = queryOptions;
  this.numberToSkip = numberToSkip;
  this.numberToReturn = numberToReturn;
  this.query = query;
  this.returnFieldSelector = returnFieldSelector;
  this.db = db;
};

inherits(QueryCommand, BaseCommand);

QueryCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_QUERY;
};

/*
struct {
    MsgHeader header;                 // standard message header
    int32     opts;                   // query options.  See below for details.
    cstring   fullCollectionName;     // "dbname.collectionname"
    int32     numberToSkip;           // number of documents to skip when returning results
    int32     numberToReturn;         // number of documents to return in the first OP_REPLY
    BSON      query ;                 // query object.  See below for details.
  [ BSON      returnFieldSelector; ]  // OPTIONAL : selector indicating the fields to return.  See below for details.
}
*/
QueryCommand.prototype.getCommandAsBuffers = function(buffers) {
  var collectionNameBuffers = BaseCommand.encodeCString(this.collectionName);
  var queryCommand = this.db.bson_serializer.BSON.serialize(this.query, false, true);
  var totalObjectLength = 0;

  // Push basic options + query
  buffers.push(BaseCommand.encodeInt(this.queryOptions), collectionNameBuffers[0], collectionNameBuffers[1],
    BaseCommand.encodeInt(this.numberToSkip), BaseCommand.encodeInt(this.numberToReturn),
    queryCommand);
    
  // Add up total length
  totalObjectLength += 4 + collectionNameBuffers[0].length + 1 + 4 + 4 + queryCommand.length;

  // Push field selector if available
  if(this.returnFieldSelector != null)  {
    var count = 0; for(var name in this.returnFieldSelector) { count += 1; }
    if(count > 0) {
      var fieldsCommand = this.db.bson_serializer.BSON.serialize(this.returnFieldSelector, false, true);
      totalObjectLength += fieldsCommand.length;
      buffers.push(fieldsCommand);
    }
  }
  
  // Return value
  return totalObjectLength
}

// Constants
QueryCommand.OPTS_NONE = 0;
QueryCommand.OPTS_TAILABLE_CURSOR = 2;
QueryCommand.OPTS_SLAVE = 4;
QueryCommand.OPTS_OPLOG_REPLY = 8;
QueryCommand.OPTS_NO_CURSOR_TIMEOUT = 16;
QueryCommand.OPTS_AWAIT_DATA = 32;
QueryCommand.OPTS_EXHAUST = 64;