var BinaryParser = require('../bson/binary_parser').BinaryParser,
  Long = require('../goog/math/long').Long;

/**
  Reply message from mongo db
**/
var MongoReply = exports.MongoReply = function(db, binary_reply) {
  this.documents = [];
  var index = 0;
  // Unpack the standard header first
  var messageLength = BinaryParser.toInt(binary_reply.substr(index, 4));
  index = index + 4;
  // Fetch the request id for this reply
  this.requestId = BinaryParser.toInt(binary_reply.substr(index, 4));
  index = index + 4;
  // Fetch the id of the request that triggered the response
  this.responseTo = BinaryParser.toInt(binary_reply.substr(index, 4));
  // Skip op-code field
  index = index + 4 + 4;
  // Unpack the reply message
  this.responseFlag = BinaryParser.toInt(binary_reply.substr(index, 4));
  index = index + 4;  
  // Unpack the cursor id (a 64 bit long integer)
  this.cursorId = new db.bson_serializer.BSON.toLong(BinaryParser.toInt(binary_reply.substr(index, 4)), BinaryParser.toInt(binary_reply.substr(index + 4, 4)));
  index = index + 8;
  // Unpack the starting from
  this.startingFrom = BinaryParser.toInt(binary_reply.substr(index, 4));
  index = index + 4;
  // Unpack the number of objects returned
  this.numberReturned = BinaryParser.toInt(binary_reply.substr(index, 4));
  index = index + 4;
  // Let's unpack all the bson document, deserialize them and store them
  for(var object_index = 0; object_index < this.numberReturned; object_index++) {
    // Read the size of the bson object
    var bsonObjectSize = BinaryParser.toInt(binary_reply.substr(index, 4));
    
    // sys.debug("--------------------------------------------------- incoming")
    // BinaryParser.hprint(binary_reply.substr(index, bsonObjectSize))
    
    // Read the entire object and deserialize it
    this.documents.push(db.bson_deserializer.BSON.deserialize(binary_reply.substr(index, bsonObjectSize)));
    // Adjust for next object
    index = index + bsonObjectSize;
  }
};

MongoReply.prototype.is_error = function(){
  if(this.documents.length == 1) {
    return this.documents[0].ok == 1 ? false : true;
  }
  return false;
};

MongoReply.prototype.error_message = function() {
  return this.documents.length == 1 && this.documents[0].ok == 1 ? '' : this.documents[0].errmsg;
};