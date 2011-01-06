var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('sys').inherits;

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
QueryCommand.prototype.getCommand = function() {
  // Generate the command string
  var command_string = BinaryParser.fromInt(this.queryOptions) + BinaryParser.encode_cstring(this.collectionName);
  command_string = command_string + BinaryParser.fromInt(this.numberToSkip) + BinaryParser.fromInt(this.numberToReturn);
  command_string = command_string + this.db.bson_serializer.BSON.serialize(this.query);
  if(this.returnFieldSelector != null)  {
    var count = 0; for(var name in this.returnFieldSelector) { count += 1; }
    if(count > 0) command_string = command_string + this.db.bson_serializer.BSON.serialize(this.returnFieldSelector);
  }
  return command_string;
};

// Constants
QueryCommand.OPTS_NONE = 0;
QueryCommand.OPTS_TAILABLE_CURSOR = 2;
QueryCommand.OPTS_SLAVE = 4;
QueryCommand.OPTS_OPLOG_REPLY = 8;
QueryCommand.OPTS_NO_CURSOR_TIMEOUT = 16;