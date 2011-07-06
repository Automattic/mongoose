var BaseCommand = require('./base_command').BaseCommand,
  BinaryParser = require('../bson/binary_parser').BinaryParser,
  inherits = require('util').inherits;

/**
  Update Document Command
**/
var UpdateCommand = exports.UpdateCommand = function(db, collectionName, spec, document, options) {
  BaseCommand.apply(this);

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


UpdateCommand.prototype.getOpCode = function() {
  return BaseCommand.OP_UPDATE;
};

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
UpdateCommand.prototype.getCommand = function() {
  // Generate the command string
  var command_string = BinaryParser.fromInt(0) + BinaryParser.encode_cstring(this.collectionName);
  return command_string + BinaryParser.fromInt(this.flags) + this.db.bson_serializer.BSON.serialize(this.spec) + this.db.bson_serializer.BSON.serialize(this.document, false);
};

// Constants
UpdateCommand.DB_UPSERT = 0;
UpdateCommand.DB_MULTI_UPDATE = 1;