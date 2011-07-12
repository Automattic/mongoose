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

QueryCommand.OP_QUERY = 2004;

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
QueryCommand.prototype.toBinary = function() {
  // debug("======================================================= QUERY")
  // debug("================ " + this.db.bson_serializer.BSON.calculateObjectSize(this.query))
  
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + Buffer.byteLength(this.collectionName) + 1 + 4 + 4 + this.db.bson_serializer.BSON.calculateObjectSize(this.query) + (4 * 4);
  // Calculate extra fields size
  if(this.returnFieldSelector != null)  {
    if(Object.keys(this.returnFieldSelector).length > 0) {
      totalLengthOfCommand += this.db.bson_serializer.BSON.calculateObjectSize(this.returnFieldSelector);
    }
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
  _command[_index + 3] = (QueryCommand.OP_QUERY >> 24) & 0xff;     
  _command[_index + 2] = (QueryCommand.OP_QUERY >> 16) & 0xff;
  _command[_index + 1] = (QueryCommand.OP_QUERY >> 8) & 0xff;
  _command[_index] = QueryCommand.OP_QUERY & 0xff;
  // Adjust index
  _index = _index + 4;

  // Write the query options
  _command[_index + 3] = (this.queryOptions >> 24) & 0xff;     
  _command[_index + 2] = (this.queryOptions >> 16) & 0xff;
  _command[_index + 1] = (this.queryOptions >> 8) & 0xff;
  _command[_index] = this.queryOptions & 0xff;
  // Adjust index
  _index = _index + 4;

  // Write the collection name to the command
  _index = _index + _command.write(this.collectionName, _index, 'utf8') + 1;
  _command[_index - 1] = 0;    
  
  // Write the number of documents to skip
  _command[_index + 3] = (this.numberToSkip >> 24) & 0xff;     
  _command[_index + 2] = (this.numberToSkip >> 16) & 0xff;
  _command[_index + 1] = (this.numberToSkip >> 8) & 0xff;
  _command[_index] = this.numberToSkip & 0xff;
  // Adjust index
  _index = _index + 4;

  // Write the number of documents to return
  _command[_index + 3] = (this.numberToReturn >> 24) & 0xff;     
  _command[_index + 2] = (this.numberToReturn >> 16) & 0xff;
  _command[_index + 1] = (this.numberToReturn >> 8) & 0xff;
  _command[_index] = this.numberToReturn & 0xff;
  // Adjust index
  _index = _index + 4;
    
  // Serialize the query document straight to the buffer
  var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.query, this.checkKeys, _command, _index) - _index + 1;
  // debug(inspect("===================== documentLength :: " + documentLength))
  
  // Write the length to the document
  _command[_index + 3] = (documentLength >> 24) & 0xff;     
  _command[_index + 2] = (documentLength >> 16) & 0xff;
  _command[_index + 1] = (documentLength >> 8) & 0xff;
  _command[_index] = documentLength & 0xff;
  // Update index in buffer
  _index = _index + documentLength;
  // Add terminating 0 for the object
  _command[_index - 1] = 0;    

  // Push field selector if available
  if(this.returnFieldSelector != null)  {
    if(Object.keys(this.returnFieldSelector).length > 0) {
      var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.returnFieldSelector, this.checkKeys, _command, _index) - _index + 1;
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
  }
  
  // debug("------------------------------------------------------------------------")
  // debug(inspect(_command))
  
  return _command;
};

// Constants
QueryCommand.OPTS_NONE = 0;
QueryCommand.OPTS_TAILABLE_CURSOR = 2;
QueryCommand.OPTS_SLAVE = 4;
QueryCommand.OPTS_OPLOG_REPLY = 8;
QueryCommand.OPTS_NO_CURSOR_TIMEOUT = 16;
QueryCommand.OPTS_AWAIT_DATA = 32;
QueryCommand.OPTS_EXHAUST = 64;