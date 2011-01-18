var BinaryParser = require('../bson/binary_parser').BinaryParser,
  Chunk = require('./chunk').Chunk,
  DbCommand = require('../commands/db_command').DbCommand,
  OrderedHash = require('../bson/collections').OrderedHash,
  Integer = require('../goog/math/integer').Integer,
  Long = require('../goog/math/long').Long,
  ObjectID = require('../bson/bson').ObjectID,
  Buffer = require('buffer').Buffer;

var GridStore = exports.GridStore = function(db, filename, mode, options) {
  this.db = db;
  this.filename = filename;
  this.mode = mode == null ? "r" : mode;
  this.options = options == null ? {} : options;
  this.root = this.options['root'] == null ? exports.GridStore.DEFAULT_ROOT_COLLECTION : this.options['root'];
  this.position = 0;
  // Getters and Setters
  this.__defineGetter__("chunkSize", function() { return this.internalChunkSize; });
  this.__defineSetter__("chunkSize", function(value) {
    if(!(this.mode[0] == "w" && this.position == 0 && this.uploadDate == null)) {
      this.internalChunkSize = this.internalChunkSize;
    } else {
      this.internalChunkSize = value;
    }
  });
  this.__defineGetter__("md5", function() { return this.internalMd5; });
  this.__defineSetter__("md5", function(value) {});
};

GridStore.prototype.open = function(callback) {
  var self = this;

  this.collection(function(err, collection) {
    collection.find({'filename':self.filename}, function(err, cursor) {
      cursor.nextObject(function(err, doc) {
        // Chek if the collection for the files exists otherwise prepare the new one
        if(doc != null) {
          self.fileId = doc._id;
          self.contentType = doc.contentType;
          self.internalChunkSize = doc.chunkSize;
          self.uploadDate = doc.uploadDate;
          self.aliases = doc.aliases;
          self.length = doc.length;
          self.metadata = doc.metadata;
          self.internalMd5 = doc.md5;
        } else {
          self.fileId = new ObjectID();
          self.contentType = exports.GridStore.DEFAULT_CONTENT_TYPE;
          self.internalChunkSize = Chunk.DEFAULT_CHUNK_SIZE;
          self.length = 0;
        }

        // Process the mode of the object
        if(self.mode == "r") {
          self.nthChunk(0, function(err, chunk) {
            self.currentChunk = chunk;
            self.position = 0;
            callback(null, self);
          });
        } else if(self.mode == "w") {
          self.chunkCollection(function(err, collection2) {
            // Create index for the chunks
            collection.createIndex([['files_id', 1], ['n', 1]], function(err, index) {
              // Delete any existing chunks
              self.deleteChunks(function(err, result) {
                self.currentChunk = new Chunk(self, {'n':0});
                self.contentType = self.options['content_type'] == null ? self.contentType : self.options['content_type'];
                self.internalChunkSize = self.options['chunk_size'] == null ? self.internalChunkSize : self.options['chunk_size'];
                self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
                self.position = 0;
                callback(null, self);
              });
            });
          });
        } else if(self.mode == "w+") {
          self.chunkCollection(function(err, collection) {
            // Create index for the chunks
            collection.createIndex([['files_id', 1], ['n', 1]], function(err, index) {
              self.nthChunk(self.lastChunkNumber, function(err, chunk) {
                // Set the current chunk
                self.currentChunk = chunk == null ? new Chunk(self, {'n':0}) : chunk;
                self.currentChunk.position = self.currentChunk.data.length();
                self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
                self.position = self.length;
                callback(null, self);
              });
            });
          });
        } else {
          callback(new Error("Illegal mode " + self.mode), null);
        }
      });
    });
  });
};

GridStore.prototype.write = function(string, close, callback) {
  if(typeof close === "function") { callback = close; close = null; }
  var self = this;
  var finalClose = close == null ? false : close;
  string = string instanceof Buffer ? string.toString() : string;

  if(self.mode[0] != "w") {
    callback(new Error(self.filename + " not opened for writing"), null);
  } else {
    if((self.currentChunk.position + string.length) > self.chunkSize) {
      var previousChunkNumber = self.currentChunk.chunkNumber;
      var leftOverDataSize = self.chunkSize - self.currentChunk.position;
      var previousChunkData = string.substr(0, leftOverDataSize);
      var leftOverData = string.substr(leftOverData, (string.length - leftOverDataSize));
      // Let's finish the current chunk and then call write again for the remaining data
      self.currentChunk.write(previousChunkData, function(err, chunk) {
        chunk.save(function(err, result) {
          self.currentChunk = new Chunk(self, {'n': (previousChunkNumber + 1)});
          self.position = self.position + leftOverDataSize;
          // Write the remaining data
          self.write(leftOverData, function(err, gridStore) {
            if(finalClose) {
              self.close(function(err, result) {
                callback(null, gridStore);
              });
            } else {
              callback(null, gridStore);
            }
          });
        });
      });
    } else {
      self.currentChunk.write(string, function(err, chunk) {
        self.position = self.position + string.length;
        if(finalClose) {
          self.close(function(err, result) {
            callback(null, self);
          });
        } else {
          callback(null, self);
        }
      });
    }
  }
};

GridStore.prototype.buildMongoObject = function(callback) {
  // var mongoObject = new OrderedHash();
  var length = this.currentChunk != null ? (this.currentChunk.chunkNumber * this.chunkSize + this.currentChunk.position) : 0;
  var mongoObject = {
    '_id': this.fileId,
    'filename': this.filename,
    'contentType': this.contentType,
    'length': length < 0 ? 0 : length,
    'chunkSize': this.chunkSize,
    'uploadDate': this.uploadDate,
    'aliases': this.aliases,
    'metadata': this.metadata
  };

  var md5Command = new OrderedHash();
  md5Command.add('filemd5', this.fileId).add('root', this.root);

  this.db.command(md5Command, function(err, results) {
    mongoObject.md5 = results.md5;
    callback(mongoObject);
  });
};

GridStore.prototype.close = function(callback) {
  var self = this;

  if(self.mode[0] == "w") {
    if(self.currentChunk != null && self.currentChunk.position > 0) {
      self.currentChunk.save(function(err, chuck) {
        self.collection(function(err, files) {
          // Build the mongo object
          if(self.uploadDate != null) {
            files.remove({'_id':self.fileId}, function(err, collection) {
              self.buildMongoObject(function(mongoObject) {
                files.save(mongoObject, function(err, doc) {
                  callback(err, doc);
                });
              });
            });
          } else {
            self.uploadDate = new Date();
            self.buildMongoObject(function(mongoObject) {
              files.save( mongoObject, function(err, doc) {
                callback(err, doc);
              });
            });
          }
        });
      });
    } else {
      self.collection(function(err, files) {
        self.uploadDate = new Date();
        self.buildMongoObject(function(mongoObject) {
          files.save(mongoObject, function(err, doc) {
            callback(err, doc);
          });
        });
      });
    }
  } else {
    callback(new Error("Illegal mode " + self.mode), null);
  }
};

GridStore.prototype.nthChunk = function(chunkNumber, callback) {
  var self = this;

  self.chunkCollection(function(err, collection) {
    collection.find({'files_id':self.fileId, 'n':chunkNumber}, function(err, cursor) {
      cursor.nextObject(function(err, chunk) {
        var finalChunk = chunk == null ? {} : chunk;
        callback(null, new Chunk(self, finalChunk));
      });
    });
  });
};

GridStore.prototype.lastChunkNumber = function() {
  return Integer.fromNumber((self.length/self.chunkSize)).toInt();
};

GridStore.prototype.chunkCollection = function(callback) {
  this.db.collection((this.root + ".chunks"), callback);
};

GridStore.prototype.deleteChunks = function(callback) {
  var self = this;

  if(self.fileId != null) {
    self.chunkCollection(function(err, collection) {
      collection.remove({'files_id':self.fileId}, function(err, result) {
        callback(null, true);
      });
    });
  } else {
    callback(null, true);
  }
};

GridStore.prototype.collection = function(callback) {
  this.db.collection(this.root + ".files", function(err, collection) {
    callback(err, collection);
  });
};

GridStore.prototype.readlines = function(separator, callback) {
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  separator = args.length ? args.shift() : null;

  this.read(function(err, data) {
    var items = data.split(separator);
    items = items.length > 0 ? items.splice(0, items.length - 1) : [];
    for(var i = 0; i < items.length; i++) {
      items[i] = items[i] + separator;
    }
    callback(null, items);
  });
};

GridStore.prototype.rewind = function(callback) {
  var self = this;

  if(this.currentChunk.chunkNumber != 0) {
    if(this.mode[0] == "w") {
      self.deleteChunks(function(err, gridStore) {
        self.currentChunk = new Chunk(self, {'n': 0});
        self.position = 0;
        callback(null, self);
      });
    } else {
      self.currentChunk(0, function(err, chunk) {
        self.currentChunk = chunk;
        self.currentChunk.rewind();
        self.position = 0;
        callback(null, self);
      });
    }
  } else {
    self.currentChunk.rewind();
    self.position = 0;
    callback(null, self);
  }
};

GridStore.prototype.read = function(length, buffer, callback) {
  var self = this;

  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  length = args.length ? args.shift() : null;
  buffer = args.length ? args.shift() : null;

  // The data is a c-terminated string and thus the length - 1
  var finalBuffer = buffer == null ? '' : buffer;
  var finalLength = length == null ? self.length - self.position : length;
  var numberToRead = finalLength;

  if((self.currentChunk.length() - self.currentChunk.position + 1 + finalBuffer.length) >= finalLength) {
    finalBuffer = finalBuffer + self.currentChunk.read(finalLength - finalBuffer.length);
    numberToRead = numberToRead - finalLength;
    self.position = finalBuffer.length;
    callback(null, finalBuffer);
  } else {
    finalBuffer = finalBuffer + self.currentChunk.read(self.currentChunk.length());
    numberToRead = numberToRead - self.currentChunk.length();
    // Load the next chunk and read some more
    self.nthChunk(self.currentChunk.chunkNumber + 1, function(err, chunk) {
      self.currentChunk = chunk;
      self.read(length, finalBuffer, callback);
    });
  }
};

GridStore.prototype.tell = function(callback) {
  callback(null, this.position);
};

GridStore.prototype.seek = function(position, seekLocation, callback) {
  var self = this;

  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  seekLocation = args.length ? args.shift() : null;

  var seekLocationFinal = seekLocation == null ? exports.GridStore.IO_SEEK_SET : seekLocation;
  var finalPosition = position;
  var targetPosition = 0;
  if(seekLocationFinal == exports.GridStore.IO_SEEK_CUR) {
    targetPosition = self.position + finalPosition;
  } else if(seekLocationFinal == exports.GridStore.IO_SEEK_END) {
    targetPosition = self.length + finalPosition;
  } else {
    targetPosition = finalPosition;
  }

  var newChunkNumber = Integer.fromNumber((targetPosition/self.chunkSize)).toInt();
  if(newChunkNumber != self.currentChunk.chunkNumber) {
    if(self.mode[0] == 'w') {
      self.currentChunk.save(function(err, chunk) {
        self.nthChunk(newChunkNumber, function(err, chunk) {
          self.currentChunk = chunk;
          self.position = targetPosition;
          self.currentChunk.position = (self.position % self.chunkSize);
          callback(null, self);
        });
      });
    }
  } else {
    self.position = targetPosition;
    self.currentChunk.position = (self.position % self.chunkSize);
    callback(null, self);
  }
};

GridStore.prototype.eof = function() {
  return this.position == this.length ? true : false;
};

GridStore.prototype.getc = function(callback) {
  var self = this;

  if(self.eof()) {
    callback(null, null);
  } else if(self.currentChunk.eof()) {
    self.nthChunk(self.currentChunk.chunkNumber + 1, function(err, chunk) {
      self.currentChunk = chunk;
      self.position = self.position + 1;
      callback(null, self.currentChunk.getc());
    });
  } else {
    self.position = self.position + 1;
    callback(null, self.currentChunk.getc());
  }
};

GridStore.prototype.puts = function(string, callback) {
  var finalString = string.match(/\n$/) == null ? string + "\n" : string;
  this.write(finalString, callback);
};

GridStore.DEFAULT_ROOT_COLLECTION = 'fs';
GridStore.DEFAULT_CONTENT_TYPE = 'text/plain';
GridStore.IO_SEEK_SET = 0;
GridStore.IO_SEEK_CUR = 1;
GridStore.IO_SEEK_END = 2;

GridStore.exist = function(db, name, rootCollection, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  rootCollection = args.length ? args.shift() : null;

  var rootCollectionFinal = rootCollection != null ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
  db.collection(rootCollectionFinal + ".files", function(err, collection) {
    collection.find({'filename':name}, function(err, cursor) {
      cursor.nextObject(function(err, item) {
        callback(null, item == null ? false : true);
      });
    });
  });
};

GridStore.list = function(db, rootCollection, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  rootCollection = args.length ? args.shift() : null;

  var rootCollectionFinal = rootCollection != null ? rootCollection : GridStore.DEFAULT_ROOT_COLLECTION;
  var items = [];
  db.collection((rootCollectionFinal + ".files"), function(err, collection) {
    collection.find(function(err, cursor) {
     cursor.each(function(err, item) {
       if(item != null) {
         items.push(item.filename);
       } else {
         callback(null, items);
       }
     });
    });
  });
};

GridStore.read = function(db, name, length, offset, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  length = args.length ? args.shift() : null;
  offset = args.length ? args.shift() : null;
  options = args.length ? args.shift() : null;

  new GridStore(db, name, "r", options).open(function(err, gridStore) {
    // Make sure we are not reading out of bounds
    if(offset && offset >= gridStore.length) return callback("offset larger than size of file", null);
    if(length && length > gridStore.length) return callback("length is larger than the size of the file", null);
    if(offset && length && (offset + length) > gridStore.length) return callback("offset and length is larger than the size of the file", null);
    
    if(offset != null) {
      gridStore.seek(offset, function(err, gridStore) {
        gridStore.read(length, function(err, data) {
          callback(err, data);
        });
      });
    } else {
      gridStore.read(length, function(err, data) {
        callback(err, data);
      });
    }
  });
};

GridStore.readlines = function(db, name, separator, options, callback) {
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  separator = args.length ? args.shift() : null;
  options = args.length ? args.shift() : null;

  var finalSeperator = separator == null ? "\n" : separator;
  new GridStore(db, name, "r", options).open(function(err, gridStore) {
    gridStore.readlines(finalSeperator, function(err, lines) {
      callback(err, lines);
    });
  });
};

GridStore.unlink = function(db, names, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  options = args.length ? args.shift() : null;

  if(names.constructor == Array) {
    for(var i = 0; i < names.length; i++) {
      self.unlink(function(result) {
        if(i == (names.length - 1)) callback(null, self);
      }, db, names[i]);
    }
  } else {
    new GridStore(db, names, "w", options).open(function(err, gridStore) {
      gridStore.deleteChunks(function(err, result) {
        gridStore.collection(function(err, collection) {
          collection.remove({'_id':gridStore.fileId}, function(err, collection) {
            callback(err, self);
          });
        });
      });
    });
  }
};
