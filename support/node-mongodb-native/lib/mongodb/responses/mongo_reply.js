var Long = require('../goog/math/long').Long,
  debug = require('util').debug,
  inspect = require('util').inspect,
  binaryutils = require('../bson/binary_utils');  

/**
  Reply message from mongo db
**/
var MongoReply = exports.MongoReply = function(db, binary_reply) {
  // debug("------------------------------------------------------------------------- 1")
  // debug(inspect(binary_reply.length))
  // // debug(inspect(data))
  // for(var j = 0; j < binary_reply.length; j++) {
  //   // debug("------")
  //   debug(binary_reply[j] + " :: " + binary_reply.toString('ascii', j, j + 1))
  // }    
  
  this.documents = [];
  var index = 0;
  // Unpack the standard header first
  var messageLength = binaryutils.decodeUInt32(binary_reply, index);  
  index = index + 4;
  // Fetch the request id for this reply
  this.requestId = binaryutils.decodeUInt32(binary_reply, index);  
  index = index + 4;
  // Fetch the id of the request that triggered the response
  this.responseTo = binaryutils.decodeUInt32(binary_reply, index);  
  // Skip op-code field
  index = index + 4 + 4;
  // Unpack the reply message
  this.responseFlag = binaryutils.decodeUInt32(binary_reply, index);  
  index = index + 4;
  // Unpack the cursor id (a 64 bit long integer)
  var low_bits = binaryutils.decodeUInt32(binary_reply, index);
  var high_bits = binaryutils.decodeUInt32(binary_reply, index + 4);

  this.cursorId = new db.bson_deserializer.Long(low_bits, high_bits);
  index = index + 8;
  // Unpack the starting from
  this.startingFrom = binaryutils.decodeUInt32(binary_reply, index);  
  index = index + 4;
  // Unpack the number of objects returned
  this.numberReturned = binaryutils.decodeUInt32(binary_reply, index);  
  index = index + 4;
  
  // Let's unpack all the bson document, deserialize them and store them
  for(var object_index = 0; object_index < this.numberReturned; object_index++) {
    // Read the size of the bson object    
    var bsonObjectSize = binaryutils.decodeUInt32(binary_reply, index);  
    
    // debug("================================================================== bsonObjectSize  = " + bsonObjectSize)    
    // Deserialize the object and add to the documents array
    this.documents.push(db.bson_deserializer.BSON.deserialize(binary_reply.slice(index, index + bsonObjectSize)));
    // Adjust binary index to point to next block of binary bson data
    index = index + bsonObjectSize;
  }    
  // debug("--------------------------------------------------- docs")
  // debug(inspect(this.documents))
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