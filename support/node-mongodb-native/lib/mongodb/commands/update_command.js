var BaseCommand = require('./base_command').BaseCommand,
  inherits = require('util').inherits,
  debug = require('util').debug,
  inspect = require('util').inspect;

/**
  Update Document Command
**/
var UpdateCommand = exports.UpdateCommand = function(db, collectionName, spec, document, options) {
  BaseCommand.call(this);

  this.collectionName = collectionName;
  this.spec = spec;
  this.document = document;
  this.db = db;

  // Generate correct flags
  var db_upsert = 0;
  var db_multi_update = 0;
  db_upsert = options != null && options['upsert'] != null ? (options['upsert'] == true ? 1 : 0) : db_upsert;
  db_multi_update = options != null && options['multi'] != null ? (options['multi'] == true ? 1 : 0) : db_multi_update;

  // Flags
  this.flags = parseInt(db_multi_update.toString() + db_upsert.toString(), 2);
};

inherits(UpdateCommand, BaseCommand);

UpdateCommand.OP_UPDATE = 2001;

/*
struct {
    MsgHeader header;             // standard message header
    int32     ZERO;               // 0 - reserved for future use
    cstring   fullCollectionName; // "dbname.collectionname"
    int32     flags;              // bit vector. see below
    BSON      spec;               // the query to select the document
    BSON      document;           // the document data to update with or insert
}
*/
UpdateCommand.prototype.toBinary = function() {
  // Calculate total length of the document
  var totalLengthOfCommand = 4 + Buffer.byteLength(this.collectionName) + 1 + 4 + this.db.bson_serializer.BSON.calculateObjectSize(this.spec) +
      this.db.bson_serializer.BSON.calculateObjectSize(this.document) + (4 * 4);

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
  _command[_index + 3] = (UpdateCommand.OP_UPDATE >> 24) & 0xff;     
  _command[_index + 2] = (UpdateCommand.OP_UPDATE >> 16) & 0xff;
  _command[_index + 1] = (UpdateCommand.OP_UPDATE >> 8) & 0xff;
  _command[_index] = UpdateCommand.OP_UPDATE & 0xff;
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

  // Write the update flags
  _command[_index + 3] = (this.flags >> 24) & 0xff;     
  _command[_index + 2] = (this.flags >> 16) & 0xff;
  _command[_index + 1] = (this.flags >> 8) & 0xff;
  _command[_index] = this.flags & 0xff;
  // Adjust index
  _index = _index + 4;

  // Serialize the spec document
  var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.spec, this.checkKeys, _command, _index) - _index + 1;
  // Write the length to the document
  _command[_index + 3] = (documentLength >> 24) & 0xff;     
  _command[_index + 2] = (documentLength >> 16) & 0xff;
  _command[_index + 1] = (documentLength >> 8) & 0xff;
  _command[_index] = documentLength & 0xff;
  // Update index in buffer
  _index = _index + documentLength;
  // Add terminating 0 for the object
  _command[_index - 1] = 0;    

  // Serialize the document
  var documentLength = this.db.bson_serializer.BSON.serializeWithBufferAndIndex(this.document, this.checkKeys, _command, _index) - _index + 1;
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

// Constants
UpdateCommand.DB_UPSERT = 0;
UpdateCommand.DB_MULTI_UPDATE = 1;