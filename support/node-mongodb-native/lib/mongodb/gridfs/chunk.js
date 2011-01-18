var BinaryParser = require('../bson/binary_parser').BinaryParser,
  OrderedHash = require('../bson/collections').OrderedHash,
  BSON = require('../bson/bson'),
  ObjectID = BSON.ObjectID,
  Binary = BSON.Binary;

var Chunk = exports.Chunk = function(file, mongoObject) {
  this.file = file;
  var mongoObjectFinal = mongoObject == null ? new OrderedHash() : mongoObject;
  this.objectId = mongoObjectFinal._id == null ? new ObjectID() : mongoObjectFinal._id;
  this.chunkNumber = mongoObjectFinal.n == null ? 0 : mongoObjectFinal.n;
  this.data = new Binary();

  if(mongoObjectFinal.data == null) {
  } else if(mongoObjectFinal.data.constructor == String) {
    var buffer = new Buffer(mongoObjectFinal.data.length);
    buffer.write(mongoObjectFinal.data, 'binary', 0);
    this.data = new Binary(buffer);
  } else if(mongoObjectFinal.data.constructor == Array) {
    var buffer = new Buffer(mongoObjectFinal.data.length);
    buffer.write(mongoObjectFinal.data.join(''), 'binary', 0);
    this.data = new Binary(buffer);
  } else if(mongoObjectFinal.data instanceof Binary) {    
    this.data = mongoObjectFinal.data;
  } else {
    throw Error("Illegal chunk format");
  }
  // Update position
  this.internalPosition = 0;
  // Getters and Setters
  this.__defineGetter__("position", function() { return this.internalPosition; });
  this.__defineSetter__("position", function(value) { this.internalPosition = value; });
};

Chunk.prototype.write = function(data, callback) {
  this.data.write(data, this.internalPosition);
  this.internalPosition = this.data.length();
  callback(null, this);
};

Chunk.prototype.read = function(length) {
  if(this.length() - this.internalPosition + 1 >= length) {
    var data = this.data.read(this.internalPosition, length);
    this.internalPosition = this.internalPosition + length;
    return data;
  } else {
    return '';
  }
};

Chunk.prototype.eof = function() {
  return this.internalPosition == this.length() ? true : false;
};

Chunk.prototype.getc = function() {
  return this.read(1);
};

Chunk.prototype.rewind = function() {
  this.internalPosition = 0;
  this.data = new Binary();
};

Chunk.prototype.save = function(callback) {
  var self = this;

  self.file.chunkCollection(function(err, collection) {
    collection.remove({'_id':self.objectId}, function(err, collection) {
      if(self.data.length() > 0) {
        self.buildMongoObject(function(mongoObject) {
          collection.insert(mongoObject, function(collection) {
            callback(null, self);
          });
        });
      } else {
        callback(null, self);
      }
    });
  });
};

Chunk.prototype.buildMongoObject = function(callback) {
  var mongoObject = {'_id': this.objectId,
    'files_id': this.file.fileId,
    'n': this.chunkNumber,
    'data': this.data};
  callback(mongoObject);
};

Chunk.prototype.length = function() {
  return this.data.length();
};

Chunk.DEFAULT_CHUNK_SIZE = 1024 * 256;