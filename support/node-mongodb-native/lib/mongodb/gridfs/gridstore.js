/**
 * @fileOverview GridFS is a tool for MongoDB to store files to the database.
 * Because of the restrictions of the object size the database can hold, a
 * facility to split a file into several chunks is needed. The {@link GridStore}
 * class offers a simplified api to interact with files while managing the
 * chunks of split files behind the scenes. More information about GridFS can be
 * found <a href="http://www.mongodb.org/display/DOCS/GridFS">here</a>.
 */

var BinaryParser = require('../bson/binary_parser').BinaryParser,
  Chunk = require('./chunk').Chunk,
  DbCommand = require('../commands/db_command').DbCommand,
  Buffer = require('buffer').Buffer,
  fs = require('fs'),
  util = require('util'),
  debug = require('util').debug,
  inspect = require('util').inspect,
  Stream = require('stream').Stream;

/**
 * A class representation of a file stored in GridFS.
 *
 * @class
 *
 * @param db {Db} A database instance to interact with.
 * @param filename {string} The name for the file.
 * @param mode {?string} Set the mode for this file. Available modes:
 *     <ul>
 *       <li>"r" - read only. This is the default mode.</li>
 *       <li>"w" - write in truncate mode. Existing data will be overwriten</li>
 *       <li>"w+" - write in edit mode.</li>
 *     </ul>

 * @param options {?object} Optional properties to specify. Recognized keys:
 *
 *     <pre><code>
 *     {
 *       'root' : , // {string} root collection to use. Defaults to GridStore#DEFAULT_ROOT_COLLECTION
 *       'chunk_type' : , // {string} mime type of the file. Defaults to GridStore#DEFAULT_CONTENT_TYPE
 *       'chunk_size' : , // {number} size for the chunk. Defaults to Chunk#DEFAULT_CHUNK_SIZE.
 *       'metadata' : , // {object} arbitrary data the user wants to store
 *     }
 *     </code></pre>
 *
 * @see <a href="http://www.mongodb.org/display/DOCS/GridFS+Specification">MongoDB GridFS Specification</a>
 */
var GridStore = exports.GridStore = function(db, filename, mode, options) {
  this.db = db;
  this.filename = filename;
  this.mode = mode == null ? "r" : mode;
  this.options = options == null ? {} : options;
  this.root = this.options['root'] == null ? exports.GridStore.DEFAULT_ROOT_COLLECTION : this.options['root'];
  this.position = 0;

	/**
	 * The chunk size used by this file.
	 *
	 * @name chunkSize
	 * @lends GridStore
	 * @field
	 */
  this.__defineGetter__("chunkSize", function() { return this.internalChunkSize; });
  this.__defineSetter__("chunkSize", function(value) {
    if(!(this.mode[0] == "w" && this.position == 0 && this.uploadDate == null)) {
      this.internalChunkSize = this.internalChunkSize;
    } else {
      this.internalChunkSize = value;
    }
  });

	/**
	 * The md5 checksum for this file.
	 *
	 * @name md5
	 * @lends GridStore
	 * @field
	 */
  this.__defineGetter__("md5", function() { return this.internalMd5; });
  this.__defineSetter__("md5", function(value) {});
};

/**
 * Opens the file from the database and initialize this object. Also creates a
 * new one if file does not exist.
 *
 * @param callback {function(?Error, ?GridStore)} This will be called after 
 *     executing this method. The first parameter will contain an {@link Error}
 *     object and the second parameter will be null if an error occured.
 *     Otherwise, the first parameter will be null and the second will contain
 *     the reference to this object.
 */
GridStore.prototype.open = function(callback) {
  var self = this;
  
  if((self.mode == "w" || self.mode == "w+") && self.db.serverConfig.primary != null) {
    // Get files collection
    self.collection(function(err, collection) {
      // Ensure index on files Collection
      collection.ensureIndex([['filename', 1], ['uploadDate', -1]], function(err, index) {

        // Get chunk collection
        self.chunkCollection(function(err, chunkCollection) {
          // Ensure index on chunk collection
          chunkCollection.ensureIndex([['files_id', 1], ['n', 1]], function(err, index) {
            self._open(callback);
          });
        });
      });
    });
  } else {
    self._open(callback);
  }  
}
 
GridStore.prototype._open = function(callback) {
  var self = this;

  self.collection(function(err, collection) {
    if(err!==null) {
      callback(new Error("at collection: "+err), null);
      return;
    }
  
    self.chunkCollection(function(err, chunkCollection) {
      collection.find({'filename':self.filename}, function(err, cursor) {
        // Fetch the file
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
            self.fileId = new self.db.bson_serializer.ObjectID();
            self.contentType = exports.GridStore.DEFAULT_CONTENT_TYPE;
            self.internalChunkSize = Chunk.DEFAULT_CHUNK_SIZE;
            self.length = 0;
          }

          // Process the mode of the object
          if(self.mode == "r") {
            // chunkCollection.ensureIndex([['files_id', 1], ['n', 1]], function(err, index) {
            self.nthChunk(0, function(err, chunk) {
              self.currentChunk = chunk;
              self.position = 0;
              callback(null, self);
            });
            // });
          } else if(self.mode == "w") {
            self.chunkCollection(function(err, collection2) {
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
          } else if(self.mode == "w+") {
            self.chunkCollection(function(err, collection) {
              self.nthChunk(self.lastChunkNumber(), function(err, chunk) {
                // Set the current chunk
                self.currentChunk = chunk == null ? new Chunk(self, {'n':0}) : chunk;
                self.currentChunk.position = self.currentChunk.data.length();
                self.metadata = self.options['metadata'] == null ? self.metadata : self.options['metadata'];
                self.position = self.length;
                callback(null, self);
              });
            });                
          } else {
            callback(new Error("Illegal mode " + self.mode), null);
          }
        });
      });      
    });
  });
};

/**
 * Stores a file from the file system to the GridFS database.
 *
 * @param file {string|fd} The file to store.
 * @param callback {function(*, GridStore)} This will be called after this
 *     method is executed. The first parameter will be null and the the
 *     second will contain the reference to this object.
 *
 * @see GridStore#write
 */
GridStore.prototype.writeFile = function (file, callback) {
  var self = this;
  if (typeof file === 'string') {
    fs.open(file, 'r', 0666, function (err, fd) {
      // TODO Handle err
      self.writeFile(fd, callback);
    });
    return;
  }

  self.open(function (err, self) {
    fs.fstat(file, function (err, stats) {
      var offset = 0;
      var index = 0;
      var numberOfChunksLeft = Math.min(stats.size / self.chunkSize);
      
      // Write a chunk
      var writeChunk = function() {
        fs.read(file, self.chunkSize, offset, 'binary', function(err, data, bytesRead) {
          offset = offset + bytesRead;
          // Create a new chunk for the data
          var chunk = new Chunk(self, {n:index++});
          chunk.write(data, function(err, chunk) {
            chunk.save(function(err, result) {
              // Point to current chunk
              self.currentChunk = chunk;
              // debug("=========================== err :: " + err)
              // debug("=========================== err :: " + inspect(result))
              // debug("============================= offset :: " + offset)
              
              if(offset >= stats.size) {
                fs.close(file);
                self.close(function(err, result) {
                  return callback(null, self);                  
                })                 
              } else {
                return process.nextTick(writeChunk);
              }
            });
          });
        });
      }
      
      // Process the first write
      process.nextTick(writeChunk);
      
      // var startIndices = [];
      // for (var i = 0; i < stats.size; i += self.chunkSize) startIndices.push(i);
      // 
      // startIndices.forEach(function (start, index, startIndices) {
      //   process.nextTick(function () {
      //     fs.read(file, self.chunkSize, start, 'binary', function (err, data, bytesRead) {
      //       var chunk = new Chunk(self, {n: index});
      //       chunk.write(data, function (err, chunk) {
      //         chunk.save(function (err, result) {
      //           if (index == startIndices.length -1) {
      //             self.currentChunk = chunk;
      //             self.close(function (err, result) {
      //               callback(null, self);
      //             });
      //           }
      //         });
      //       });
      //     });
      //   });
      // });
    });
  });

};

/**
 * Writes some data. This method will work properly only if initialized with mode
 * "w" or "w+".
 *
 * @param string {string} The data to write.
 * @param close {boolean=false} opt_argument Closes this file after writing if
 *     true.
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 *
 * @see GridStore#writeFile
 */
GridStore.prototype.write = function(string, close, callback) { 
  if(typeof close === "function") { callback = close; close = null; }
  var self = this;
  var finalClose = close == null ? false : close;
  string = string instanceof Buffer ? string.toString("binary") : string;

  if(self.mode[0] != "w") {
    callback(new Error(self.filename + " not opened for writing"), null);
  } else {
    if((self.currentChunk.position + string.length) > self.chunkSize) {
      var previousChunkNumber = self.currentChunk.chunkNumber;
      var leftOverDataSize = self.chunkSize - self.currentChunk.position;
      var previousChunkData = string.substr(0, leftOverDataSize);
      var leftOverData = string.substr(leftOverDataSize, (string.length - leftOverDataSize));
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

GridStore.prototype.writeBuffer = function(buffer, close, callback) {
	if(typeof close === "function") { callback = close; close = null; }
	var self = this;
	var finalClose = (close == null) ? false : close;
	
	if(self.mode[0] != "w") {
		callback(new Error(self.filename + " not opened for writing"), null);
	} 
	else {
		if((self.currentChunk.position + buffer.length) > self.chunkSize) {
			// Data exceeds current chunk remaining free size; fill up current chunk and write the rest
			// to a new chunk (recursively)
			var previousChunkNumber = self.currentChunk.chunkNumber;
			var leftOverDataSize = self.chunkSize - self.currentChunk.position;
			var firstChunkData = buffer.slice(0, leftOverDataSize);
			
			var leftOverData = buffer.slice(leftOverDataSize);
			
			// Let's finish the current chunk and then call write again for the remaining data
			self.currentChunk.write(firstChunkData, function(err, chunk) {
				chunk.save(function(err, result) {
					self.currentChunk = new Chunk(self, {'n': (previousChunkNumber + 1)});
					self.position = self.position + leftOverDataSize;
					
					// Write the remaining data
					self.writeBuffer(leftOverData, function(err, gridStore) {
						if(finalClose) {
							self.close(function(err, result) {
								callback(null, gridStore);
							});
						} 
						else {
							callback(null, gridStore);
						}
					});
				});
			});
		} 
		else {
			// Write buffer to chunk all at once
			self.currentChunk.write(buffer, function(err, chunk) {
				self.position = self.position + buffer.length;
				if(finalClose) {
					self.close(function(err, result) {
						callback(null, self);
					});
				} 
				else {
					callback(null, self);
				}
			});
		}
	}
};

/**
 * Creates a mongoDB object representation of this object.
 *
 * @param callback {function(object)} This will be called after executing this
 *     method. The object will be passed to the first parameter and will have
 *     the structure:
 *        
 *        <pre><code>
 *        {
 *          '_id' : , // {number} id for this file
 *          'filename' : , // {string} name for this file
 *          'contentType' : , // {string} mime type for this file
 *          'length' : , // {number} size of this file?
 *          'chunksize' : , // {number} chunk size used by this file
 *          'uploadDate' : , // {Date}
 *          'aliases' : , // {array of string}
 *          'metadata' : , // {string}
 *        }
 *        </code></pre>
 *
 * @see <a href="http://www.mongodb.org/display/DOCS/GridFS+Specification#GridFSSpecification-{{files}}">MongoDB GridFS File Object Structure</a>
 */
GridStore.prototype.buildMongoObject = function(callback) {
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

  var md5Command = {filemd5:this.fileId, root:this.root};
  this.db.command(md5Command, function(err, results) {
    mongoObject.md5 = results.md5;
    callback(mongoObject);
  });
};

/**
 * Saves this file to the database. This will overwrite the old entry if it
 * already exists. This will work properly only if mode was initialized to
 * "w" or "w+".
 *
 * @param callback {function(?Error, GridStore)} This will be called after
 *     executing this method. Passes an {@link Error} object to the first
 *     parameter and null to the second if an error occured. Otherwise, passes
 *     null to the first and a reference to this object to the second.
 */
GridStore.prototype.close = function(callback) {
  var self = this;

  if(self.mode[0] == "w") {
    if(self.currentChunk != null && self.currentChunk.position > 0) {
      self.currentChunk.save(function(err, chuck) {
        self.collection(function(err, files) {
          // Build the mongo object
          if(self.uploadDate != null) {
            files.remove({'_id':self.fileId}, {safe:true}, function(err, collection) {
              self.buildMongoObject(function(mongoObject) {
                files.save(mongoObject, {safe:true}, function(err, doc) {
                  callback(err, doc);
                });
              });
            });
          } else {
            self.uploadDate = new Date();
            self.buildMongoObject(function(mongoObject) {
              files.save(mongoObject, {safe:true}, function(err, doc) {
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
          files.save(mongoObject, {safe:true}, function(err, doc) {
            callback(err, doc);
          });
        });
      });
    }
  } else if(self.mode[0] == "r") {
    callback(null, null);
  } else {
    callback(new Error("Illegal mode " + self.mode), null);
  }
};

/**
 * Gets the nth chunk of this file.
 *
 * @param chunkNumber {number} The nth chunk to retrieve.
 * @param callback {function(*, Chunk|object)} This will be called after
 *     executing this method. null will be passed to the first parameter while
 *     a new {@link Chunk} instance will be passed to the second parameter if
 *     the chunk was found or an empty object {} if not.
 *
 * @see GridStore#lastChunkNumber
 */
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

/**
 * @return {number} The last chunk number of this file.
 *
 * @see GridStore#nthChunk
 */
GridStore.prototype.lastChunkNumber = function() {
  return this.db.bson_serializer.BSON.toInt((this.length/this.chunkSize));
};

/**
 * Retrieve this file's chunks collection.
 *
 * @param callback {function(?Error, ?Collection)} This will be called after
 *     executing this method. An exception object will be passed to the first 
 *     parameter when an error occured or null otherwise. A new
 *     {@link Collection} object will be passed to the second parameter if no
 *     error occured.
 *
 * @see Db#collection
 * @see GridStore#collection
 */
GridStore.prototype.chunkCollection = function(callback) {
  this.db.collection((this.root + ".chunks"), callback);
};

/**
 * Deletes all the chunks of this file in the database.
 *
 * @param callback {function(*, boolean)} This will be called after this method
 *     executes. Passes null to the first and true to the second argument.
 *
 * @see GridStore#rewind
 */
GridStore.prototype.deleteChunks = function(callback) {
  var self = this;

  if(self.fileId != null) {
    self.chunkCollection(function(err, collection) {
      if(err!==null) {
        callback(err, false);
      }
      collection.remove({'files_id':self.fileId}, {safe:true}, function(err, result) {
        callback(null, true);
      });
    });
  } else {
    callback(null, true);
  }
};

GridStore.prototype.unlink = function(callback) {
  var self = this;
  this.deleteChunks(function(err) {
    if(err!==null) {
      callback("at deleteChunks: "+err);
      return;
    }
  
    self.collection(function(err, collection) {
      if(err!==null) {
        callback("at collection: "+err);
        return;
      }
    
      collection.remove({'_id':self.fileId}, {safe:true}, function(err, collection) {
        callback(err, self);
      });
    });
  });
};

/**
 * Retrieves the file collection associated with this object.
 *
 * @param callback {function(?Error, ?Collection)} This will be called after
 *     executing this method. An exception object will be passed to the first 
 *     parameter when an error occured or null otherwise. A new
 *     {@link Collection} object will be passed to the second parameter if no
 *     error occured.
 *
 * @see Db#collection
 * @see GridStore#chunkCollection
 */
GridStore.prototype.collection = function(callback) {
  this.db.collection(this.root + ".files", function(err, collection) {
    callback(err, collection);
  });
};

/**
 * Reads the data of this file.
 *
 * @param separator {string=null} opt_argument The character to be recognized as
 *     the newline separator.
 * @param callback {function(*, Array<string>)} This will be called after this
 *     method is executed. The first parameter will be null and the second
 *     parameter will contain an array of strings representing the entire data,
 *     each element representing a line including the separator character.
 *
 * @see GridStore#read
 * @see GridStore#eof
 */
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

/**
 * Deletes all the chunks of this file in the database if mode was set to "w" or
 * "w+" and resets the read/write head to the initial position.
 *
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 *
 * @see GridStore#deleteChunks
 */
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

/**
 * Retrieves the contents of this file and advances the read/write head.
 *
 * There are 3 signatures for this method:
 *
 * (callback)
 * (length, callback)
 * (length, buffer, callback)
 *
 * @param length {number=} opt_argument The number of characters to read. Reads
 *     all the characters from the read/write head to the EOF if not specified.
 * @param buffer {string=''} opt_argument A string to hold temporary data. This
 *     is used for storing the string data read so far when recursively calling
 *     this method.
 * @param callback {function(*, string)} This will be called after this method
 *     is executed. null will be passed to the first parameter and a string 
 *     containing the contents of the buffer concatenated with the contents read
 *     from this file will be passed to the second.
 *
 * @see GridStore#readlines
 * @see GridStore#eof
 */
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

GridStore.prototype.readBuffer = function(length, buffer, callback) {
	var self = this;
	var args = Array.prototype.slice.call(arguments, 0);
	callback = args.pop();
	length = args.length ? args.shift() : null;
	buffer = args.length ? args.shift() : null;
	
	var left = Math.min(self.length - self.position, length);
	if(buffer===null) {
		buffer = new Buffer(left);
	}
	
	var leftInCurrentChunk = self.currentChunk.length()-self.currentChunk.position;
	
	// Everything can be read from this chunk
	if((leftInCurrentChunk >= left) && leftInCurrentChunk!==0) {
		var slice = self.currentChunk.readSlice(left);
		self.position += left;
		callback(null, slice);
	}
	else {
		if(leftInCurrentChunk > 0) {
			var slice = self.currentChunk.readSlice(leftInCurrentChunk);
			self.position += leftInCurrentChunk;
			slice.copy(buffer, 0, 0, leftInCurrentChunk);
		}
		
		var leftForNextChunk = left - leftInCurrentChunk;
		var subBuffer = buffer.slice(leftInCurrentChunk, leftInCurrentChunk + leftForNextChunk);
		
		self.nthChunk(self.currentChunk.chunkNumber+1, function(err, chunk) {
			self.currentChunk = chunk;
			self.readBuffer(leftForNextChunk, subBuffer, function(err, subb) {
				if(subb!==subBuffer) {
					// readBuffer returned its own buffer slice
					subb.copy(buffer, leftInCurrentChunk, 0, subb.length);
				}
				callback(err, buffer);
			});
		});
	}
}

/**
 * Retrieves the position of the read/write head of this file.
 *
 * @param callback {function(*, number)} This gets called after this method
 *     terminates. null is passed to the first parameter and the position is
 *     passed to the second.
 *
 * @see GridStore#seek
 */
GridStore.prototype.tell = function(callback) {
  callback(null, this.position);
};

/**
 * Moves the read/write head to a new location.
 *
 * There are 3 signatures for this method:
 *
 * (callback)
 * (position, callback)
 * (position, seekLocation, callback)
 *
 * @param position
 * @param seekLocation {number} Seek mode. Use one of the ff constants -
 *     {@link GridStore#IO_SEEK_SET}, {@link GridStore#IO_SEEK_CUR} or
 *     {@link GridStore#IO_SEEK_END}. Defaults to {@link GridStore#IO_SEEK_SET}
 *     when not specified.
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 *
 * @see GridStore#IO_SEEK_SET
 * @see GridStore#IO_SEEK_CUR
 * @see GridStore#IO_SEEK_END
 */
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

  var newChunkNumber = this.db.bson_serializer.BSON.toInt((targetPosition/self.chunkSize));
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

/**
 * @return {boolean} True if the read/write head is at the end of this file.
 */
GridStore.prototype.eof = function() {
  return this.position == this.length ? true : false;
};

/**
 * Retrieves a single character from this file.
 *
 * @param callback {function(*, ?string)} This gets called after this method is
 *     executed. Passes null to the first parameter and the character read to
 *     the second or null to the second if the read/write head is at the end of
 *     the file.
 */
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

/**
 * Writes a string to the file with a newline character appended at the end if
 * the given string does not have one.
 *
 * @param string {string} The string to write.
 * @param callback {function(*, GridStore)} This will be called after executing
 *     this method. The first parameter will contain null and the second one
 *     will contain a reference to this object.
 *
 * @see GridStore#write
 * @see GridStore#writeFile
 */
GridStore.prototype.puts = function(string, callback) {
  var finalString = string.match(/\n$/) == null ? string + "\n" : string;
  this.write(finalString, callback);
};

/**
 * The collection to be used for holding the files and chunks collection.
 * @constant
 */
GridStore.DEFAULT_ROOT_COLLECTION = 'fs';
/**
 * Default file mime type
 * @constant
 */
GridStore.DEFAULT_CONTENT_TYPE = 'binary/octet-stream';
/**
 * Seek mode where the given length is absolute.
 * @constant
 */
GridStore.IO_SEEK_SET = 0;
/**
 * Seek mode where the given length is an offset to the current read/write head.
 * @constant
 */
GridStore.IO_SEEK_CUR = 1;
/**
 * Seek mode where the given length is an offset to the end of the file.
 * @constant
 */
GridStore.IO_SEEK_END = 2;

/**
 * Checks if a file exists in the database.
 *
 * @param db {Db} The database to query.
 * @param name {string} The name of the file to look for.
 * @param rootCollection {string=} opt_argument The root collection that holds the files
 *     and chunks collection. Defaults to {@link GridStore.DEFAULT_ROOT_COLLECTION}
 * @param callback {function(*, boolean)} This will be called after this method
 *     executes. Passes null to the first and passes true to the second if the
 *     file exists and false otherwise.
 */
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

/**
 * Gets the list of files stored in the GridFS.
 *
 * @param db {Db} The database to query.
 * @param rootCollection {string=} opt_argument The root collection that holds the files
 *     and chunks collection. Defaults to {@link GridStore.DEFAULT_ROOT_COLLECTION}
 * @param callback {function(*, array<string>)} This will be called after this method
 *     executes. Passes null to the first and passes an array of strings containing
 *     the names of the files.
 */
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

/**
 * Reads the contents of a file.
 *
 * This method has the following signatures
 *
 * (db, name, callback)
 * (db, name, length, callback)
 * (db, name, length, offset, callback)
 * (db, name, length, offset, options, callback)
 *
 * @param db {Db} The database to query.
 * @param name {string} The name of the file
 * @param length {number=} opt_argument The size of data to read.
 * @param offset {number=} opt_argument The offset from the head of the file of
 *     which to start reading from.
 * @param options {object=} opt_argument The options for the file.
 * @param callback {function(?Error|string, ?string)} This will be called after
 *     this method executes. A string with an error message will be passed to
 *     the first parameter when the length and offset combination exceeds the
 *     length of the file while an Error object will be passed if other forms
 *     of error occured, otherwise, a string is passed. The second parameter
 *     will contain the data read if successful or null if an error occured.
 *
 * @see GridStore#read
 * @see GridStore#readlines
 * @see GridStore for how to pass the options
 */
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

/**
 * Reads the data of this file.
 *
 * @param db {Db} The database to query.
 * @param name {string} The name of the file.
 * @param separator {string=null} opt_argument The character to be recognized as
 *     the newline separator.
 * @param options {object=} opt_argument
 * @param callback {function(*, Array<string>)} This will be called after this
 *     method is executed. The first parameter will be null and the second
 *     parameter will contain an array of strings representing the entire data,
 *     each element representing a line including the separator character.
 * 
 * @see GridStore#read
 * @see GridStore#readlines
 * @see GridStore for how to pass the options
 */
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

/**
 * Deletes the chunks and metadata information of a file from GridFS.
 *
 * @param db {Db} The database to interact with.
 * @param names {string|Array<string>} The names of the files to delete.
 * @param options {object=} opt_argument The options for the files.
 * @callback {function(?Error, GridStore)} This will be called after this method
 *     is executed. The first parameter will contain an Error object if an error
 *     occured or null otherwise. The second parameter will contain a reference
 *     to this object.
 *
 * @see GridStore#deleteChunks
 * @see GridStore#rewind
 * @see GridStore for how to pass the options
 */
GridStore.unlink = function(db, names, options, callback) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 2);
  callback = args.pop();
  options = args.length ? args.shift() : null;

  if(names.constructor == Array) {
    var tc = 0;
    for(var i = 0; i < names.length; i++) {
      ++tc;
      self.unlink(db, names[i], function(result) {
        if(--tc == 0) {
            callback(null, self);
        }
      });
    }
  } else {
    new GridStore(db, names, "w", options).open(function(err, gridStore) {
      gridStore.deleteChunks(function(err, result) {
        gridStore.collection(function(err, collection) {
          collection.remove({'_id':gridStore.fileId}, {safe:true}, function(err, collection) {
            callback(err, self);
          });
        });
      });
    });
  }
};

var ReadStream = function(autoclose, gstore) {
    if (!(this instanceof ReadStream)) return new ReadStream(autoclose, gstore);
    Stream.call(this);

    this.autoclose = !!autoclose;
    this.gstore = gstore;

    this.finalLength = gstore.length - gstore.position;
    this.completedLength = 0;

    this.paused = false;
    this.readable = true;
    this.pendingChunk = null;

    var self = this;
    process.nextTick(function() {
        self._execute();
    });
};
util.inherits(ReadStream, Stream);

ReadStream.prototype._execute = function() {

    if (this.paused === true || this.readable === false) {
        return;
    }

    var gstore = this.gstore;
    var self = this;

    var last = false;
    var toRead = 0;

    if ((gstore.currentChunk.length() - gstore.currentChunk.position + 1 + self.completedLength) >= self.finalLength) {
        toRead = self.finalLength - self.completedLength;
        last = true;
    } else {
        toRead = gstore.currentChunk.length();
    }

    var data = gstore.currentChunk.readSlice(toRead);
    if (data != null) {
        self.completedLength += data.length;
        self.pendingChunk = null;
        self.emit("data", data);
    }

    if (last === true) {
        self.readable = false;
        self.emit("end");
        if (self.autoclose === true) {
            if (gstore.mode[0] == "w") {
                gstore.close(function(err, doc) {
                    if (err) {
                        self.emit("error", err);
                        return;
                    }
                    self.emit("close", doc);
                });
            } else {
                self.emit("close");
            }
        }
    } else {
        gstore.nthChunk(gstore.currentChunk.chunkNumber + 1, function(err, chunk) {
            if (err) {
                self.readable = false;
                self.emit("error", err);
                return;
            }
            self.pendingChunk = chunk;
            if (self.paused === true) {
                return;
            }
            gstore.currentChunk = self.pendingChunk;
            self._execute();
        });
    }
};

/**
 * Returns read stream based on this GridStore file
 * Supported events:
 * <ul>
 *   <li>data</li>
 *   <li>end</li>
 *   <li>close</li>
 *   <li>error</li>
 * </ul>
 *
 * @param autoclose {Boolean?false} If true current GridStore will be closed when EOF
 *                                  and 'close' event will be fired
 */
GridStore.prototype.stream = function(autoclose) {
    return new ReadStream(autoclose, this);
};


/**
 * Pauses this stream, then no farther events will be fired
 */
ReadStream.prototype.pause = function() {
    this.paused = true;
};

/**
 * Resumes this strea,
 */
ReadStream.prototype.resume = function() {
    this.paused = false;
    var self = this;
    if (self.pendingChunk) {
        self.currentChunk = self.pendingChunk;
        process.nextTick(function() {
            self._execute();
        });
    }
};

