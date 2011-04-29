var QueryCommand = require('./commands/query_command').QueryCommand,
  DbCommand = require('./commands/db_command').DbCommand,
  BinaryParser = require('./bson/binary_parser').BinaryParser,
  MongoReply = require('./responses/mongo_reply').MongoReply,
  Admin = require('./admin').Admin,
  Connection = require('./connection').Connection,
  Collection = require('./collection').Collection,
  Server = require('./connection').Server,
  ServerPair = require('./connection').ServerPair,
  ServerCluster = require('./connection').ServerCluster,
  ReplSetServers = require('./connection').ReplSetServers,
  Cursor = require('./cursor').Cursor,
  MD5 = require('./crypto/md5').MD5,
  EventEmitter = require('events').EventEmitter,
  inherits = require('sys').inherits,
  sys = require('sys');

var Db = exports.Db = function(databaseName, serverConfig, options) {
  EventEmitter.call(this);
  this.databaseName = databaseName;
  this.serverConfig = serverConfig;
  this.options = options == null ? {} : options;
  
  // Contains all the connections for the db
  try {
    this.bson_serializer = this.options.native_parser ? require('../../external-libs/bson/bson') : require('./bson/bson');
    this.bson_deserializer = this.options.native_parser ? require('../../external-libs/bson/bson') : require('./bson/bson');      
  } catch (err) {
    // If we tried to instantiate the native driver
    throw "Native bson parser not compiled, please compile or avoud using native_parser=true";
  }
  this.connections = [];
  // State of the db connection
  this.state = 'notConnected';
  this.pkFactory = this.options.pk == null ? this.bson_serializer.ObjectID : this.options.pk;  
  // Added strict
  this.strict = this.options.strict == null ? false : this.options.strict;
  this.notReplied ={};
  this.isInitializing = true;
};

inherits(Db, EventEmitter);

Db.prototype.open = function(callback) {
  var self = this;

  // Set up connections
  if(self.serverConfig instanceof Server) {
    self.serverConfig.connection = new Connection(self.serverConfig.host, self.serverConfig.port, self.serverConfig.autoReconnect);
    self.connections.push(self.serverConfig.connection);
    var server = self.serverConfig;

    self.serverConfig.connection.addListener("connect", function() {
      // Create a callback function for a given connection
      var connectCallback = function(err, reply) {   
        if(err != null) {
          return callback(err, null);
        } else if(reply.documents[0].ismaster == 1) {
          self.serverConfig.master = true;
        } else if(reply.documents[0].ismaster == 0) {
          self.serverConfig.master = false;
        }

        // emit a message saying we got a master and are ready to go and change state to reflect it
        if(self.state == 'notConnected') {
          self.state = 'connected';
          // 
          // Call the server version function via admin to adapt to changes from 1.7.6 >
          self.admin(function(err, admindb) {
            admindb.serverInfo(function(err, doc) {
              if(err != null) return callback(err, null);
              // Store the db version
              self.version = doc.version;
              callback(null, self);
            });
          });
        } else {
          callback("connection already opened");
        }
      };
      // Create db command and Add the callback to the list of callbacks by the request id (mapping outgoing messages to correct callbacks)
      var db_command = DbCommand.createIsMasterCommand(self);
      
      self.addListener(db_command.getRequestId().toString(), connectCallback);
      self.notReplied[db_command.getRequestId().toString()] = this;	
      // Let's send a request to identify the state of the server
      this.send(db_command);
    });

    self.serverConfig.connection.addListener("data", function(message) {
      // Parse the data as a reply object
      var reply = new MongoReply(self, message);
      // Emit message
      self.emit(reply.responseTo.toString(), null, reply);
      // Remove the listener
	  if ( self.notReplied[ reply.responseTo.toString()]) {
        delete self.notReplied[ reply.responseTo.toString()];
        self.removeListener(reply.responseTo.toString(), self.listeners( reply.responseTo.toString())[0] );
	  }
    });
    
    self.serverConfig.connection.addListener("error", function(err) {
      if(self.listeners("error") != null && self.listeners("error").length > 0) self.emit("error", err);
      self.state = "notConnected"
      return callback(err, null);
    });
    
    // Emit timeout and close events so the client using db can figure do proper error handling (emit contains the connection that triggered the event)
    self.serverConfig.connection.addListener("timeout", function() { self.emit("timeout", this); });
    self.serverConfig.connection.addListener("close", function() { self.emit("close", this); });
    // Open the connection
    self.serverConfig.connection.open();            
  } else if(self.serverConfig instanceof ServerPair || self.serverConfig instanceof ServerCluster) {
    var serverConnections = self.serverConfig instanceof ServerPair ? [self.serverConfig.leftServer, self.serverConfig.rightServer] : self.serverConfig.servers;
    var numberOfCheckedServers = 0; 
    
    serverConnections.forEach(function(server) {
      server.connection = new Connection(server.host, server.port, server.autoReconnect);
      self.connections.push(server.connection);
      
      var handleServerConnection = function() {
        numberOfCheckedServers+=1;
        
        if(numberOfCheckedServers == serverConnections.length) {
            if(self.masterConnection) {
                // emit a message saying we got a master and are ready to go and change state to reflect it
                self.state = 'connected';
                callback(null, self);
            } else {
                // emit error only when all servers are checked and connecting to them failed.
                self.state = "notConnected"
                callback(new Error("Failed connecting to any of the servers in the cluster"), null);
            }
        }
      }

      server.connection.addListener("connect", function() {
        // Create a callback function for a given connection

        var connectCallback = function(err, reply) {
          if(err != null) {
            callback(err, null);          
          } else {
            if(reply.documents[0].ismaster == 1) {
              // Locate the master connection and save it
  
              self.masterConnection = server.connection;
              server.master = true;
            } else {
              server.master = false;
            }
            
            handleServerConnection();
          }
        };
        // Create db command and Add the callback to the list of callbacks by the request id (mapping outgoing messages to correct callbacks)
        var db_command = DbCommand.createIsMasterCommand(self);
        
        self.addListener(db_command.getRequestId().toString(), connectCallback);
        // Let's send a request to identify the state of the server
        this.send(db_command);
      });


      server.connection.addListener("data", function(message) {
        // Parse the data as a reply object
        var reply = new MongoReply(self, message);
        // Emit error if there is one       
        reply.responseHasError ? self.emit(reply.responseTo.toString(), reply.documents[0], reply) : self.emit(reply.responseTo.toString(), null, reply);
        // Remove the listener
        self.removeListener(reply.responseTo.toString(), self.listeners(reply.responseTo.toString())[0]);
        
      });
      
      server.connection.addListener("error", function(err) {
         handleServerConnection();
      });

      // Emit timeout and close events so the client using db can figure do proper error handling (emit contains the connection that triggered the event)
      server.connection.addListener("timeout", function() { self.emit("timeout", this); });
      server.connection.addListener("close", function() { self.emit("close", this); });
      // Open the connection
      server.connection.open();
    });
  } else if ( self.serverConfig instanceof ReplSetServers ) {
    var serverConnections = self.serverConfig instanceof ServerPair ? [self.serverConfig.leftServer, self.serverConfig.rightServer] : self.serverConfig.servers;
    var numberOfConnectedServers = 0; 
    var numberOfErrorServers = 0;
    self.serverConfig.addresses = {};

    var initServer = function(server)  {
      self.serverConfig.addresses[ server.host + ':' + server.port ] = 1;
      server.connection = new Connection(server.host, server.port, server.autoReconnect);
      //console.log( 'Connect to ' + server.host + ':' + server.port );
      self.connections.push(server.connection);

      server.connection.addListener("connect", function() {
        // Create a callback function for a given connection
        var connectCallback = function(err, reply) {
          if(err != null) {
            callback(err, null);          
          } else {
            if(reply.documents[0].ismaster == 1) {
              // Locate the master connection and save it
              self.masterConnection = server.connection;
              server.master = true;
            } else {
              server.master = false;
            }
			if ( self.serverConfig instanceof ReplSetServers && ( reply.documents[0].hosts != undefined ) ) {
              var replicas = reply.documents[0].hosts;
              for( var i in replicas ) {
                if ( replicas[i] in self.serverConfig.addresses ) 
                  continue;
                self.serverConfig.addresses[ replicas[i] ] = 1;
                var ipAndPort = replicas[i].split(":");
                var newServer = new Server( ipAndPort[0], parseInt( ipAndPort[1]), { auto_reconnect: true}  );
                console.log( 'Added ' + replicas[i] + ' to the replica set' );
                serverConnections.push( newServer );
                initServer( newServer );
			  }
            }
            // emit a message saying we got a master and are ready to go and change state to reflect it
            if(++numberOfConnectedServers == serverConnections.length && (self.state == 'notConnected')) {
              self.state = 'connected';
			  self.isInitializing  = false;
              return callback(null, self);
            } 
            if ( self.serverConfig instanceof ReplSetServers && server.master ) {
               //we have the master we are ok, wait for others (if any) to connect too
               self.state = 'connected'; 
            }            
            if ( self.serverConfig instanceof ReplSetServers && ( (numberOfConnectedServers + numberOfErrorServers ) == serverConnections.length )) { 
			  self.isInitializing  = false;
              if ( self.state == 'connected' ) {
                return callback( null, self );
              } else { 
                return callback( new Error( 'No master available'), null );
              }
            }
          }
        };
        // Create db command and Add the callback to the list of callbacks by the request id (mapping outgoing messages to correct callbacks)
        var db_command = DbCommand.createIsMasterCommand(self);
        
        self.addListener(db_command.getRequestId().toString(), connectCallback);
        self.notReplied[db_command.getRequestId().toString()] = this;	

        // Let's send a request to identify the state of the server
        this.send(db_command);
        server.connection.addListener("data", function(message) {
          // Parse the data as a reply object
          var reply = new MongoReply(self, message);
          // Emit error if there is one       
          reply.responseHasError ? self.emit(reply.responseTo.toString(), reply.documents[0], reply) : self.emit(reply.responseTo.toString(), null, reply);
          // Remove the listener
          //if ( self.listeners(reply.responseTo.toString()).length )
		  if ( self.notReplied [ reply.responseTo.toString()] ) {
		    delete self.notReplied[ reply.responseTo.toString()];
            self.removeListener(reply.responseTo.toString(), self.listeners(reply.responseTo.toString())[0]);
		  }
        });
      });

      server.connection.addListener("error", function(err) {
        if ( self.serverConfig instanceof ReplSetServers && self.isInitializing) {
          //we only have one error, if the rest are ok there is no problem
          numberOfErrorServers++;
          //console.log( server.host + ':' + server.port + ' down!!!'+ err );
          if ( (numberOfErrorServers + numberOfConnectedServers) == serverConnections.length) {
			self.isInitializing  = false;
            if ( self.state == 'connected' ) {
              return callback( null, self );
            } else { 
              return callback( new Error( 'No master available'), null );
            }
          }
        } else if ( self.serverConfig instanceof ReplSetServers ) {
		  for ( var i in self.notReplied ) {
		    //console.log( 'delete event ' + i );
			if ( self.notReplied[i] == this ) {
		      delete self.notReplied[i];
		      self.emit( i, null, { documents: [{'$err':'Connection closed'}] } );
              self.removeListener( i, self.listeners( i )[0]);
			}
		  }
		} else {
          return callback(err, null);
        }
      });      

      // Emit timeout and close events so the client using db can figure do proper error handling (emit contains the connection that triggered the event)
      server.connection.addListener("timeout", function() { self.emit("timeout", this); });
      server.connection.addListener("close", function() { self.emit("close", this); });
      // Open the connection
      server.connection.open();
    };
    serverConnections.forEach( initServer );
  } else {
    return callback(Error("Server parameter must be of type Server, ServerPair, ServerCluster or ReplSetServers"), null);
  }
};

Db.prototype.close = function() {
  this.connections.forEach(function(connection) {
   connection.close();
  });
  // Clear out state of the connection
  this.state = "notConnected"
};

Db.prototype.admin = function(callback) {
  callback(null, new Admin(this));
};

/**
  Get the list of all collections for a mongo master server
**/
Db.prototype.collectionsInfo = function(collection_name, callback) {
  if(callback == null) { callback = collection_name; collection_name = null; }
  // Create selector
  var selector = {};
  // If we are limiting the access to a specific collection name
  if(collection_name != null) selector.name = this.databaseName + "." + collection_name;

  // Return Cursor
  // callback for backward compatibility
  if (callback) {
    callback(null, new Cursor(this, new Collection(this, DbCommand.SYSTEM_NAMESPACE_COLLECTION), selector));
  } else {
    return new Cursor(this, new Collection(this, DbCommand.SYSTEM_NAMESPACE_COLLECTION), selector);
  }
};

/**
  Get the list of all collection names for the specified db
**/
Db.prototype.collectionNames = function(collection_name, callback) {
  if(callback == null) { callback = collection_name; collection_name = null; }
  var self = this;
  // Let's make our own callback to reuse the existing collections info method
  self.collectionsInfo(collection_name, function(err, cursor) {
    cursor.toArray(function(err, documents) {
      // List of result documents that have been filtered
      var filtered_documents = [];
      // Remove any collections that are not part of the db or a system db signed with $
      documents.forEach(function(document) {
        if(!(document.name.indexOf(self.databaseName) == -1 || document.name.indexOf('$') != -1))
          filtered_documents.push(document);
      });
      // Return filtered items
      callback(null, filtered_documents);
    });
  });
};

/**
  Fetch a specific collection (containing the actual collection information)
**/
Db.prototype.collection = function(collectionName, callback) {
  var self = this;

  try {
    if(self.strict) {
      self.collectionNames(collectionName, function(err, collections) {
        if(collections.length == 0) {
          callback(new Error("Collection " + collectionName + " does not exist. Currently in strict mode."), null);
        } else {
          return callback(null, new Collection(self, collectionName, self.pkFactory));
        }
      });
    } else {
      return callback(null, new Collection(self, collectionName, self.pkFactory));
    }
  } catch(err) {
    return callback(err, null);
  }
};

/**
  Fetch all collections for the given db
**/
Db.prototype.collections = function(callback) {
  var self = this;
  // Let's get the collection names
  self.collectionNames(function(err, documents) {
    var collections = [];
    documents.forEach(function(document) {
      collections.push(new Collection(self, document.name.replace(self.databaseName + ".", '')));
    });
    // Return the collection objects
    callback(null, collections);
  });
};

/**
  Evaluate javascript on the server
**/
Db.prototype.eval = function(code, parameters, callback) {
  if(typeof parameters === "function") { callback = parameters; parameters = null; }
  var finalCode = code;
  var finalParameters = [];
  // If not a code object translate to one
  if(!(finalCode instanceof this.bson_serializer.Code)) {
    finalCode = new this.bson_serializer.Code(finalCode);
  }

  // Ensure the parameters are correct
  if(parameters != null && parameters.constructor != Array) {
    finalParameters = [parameters];
  } else if(parameters != null && parameters.constructor == Array) {
    finalParameters = parameters;
  }
  // Create execution selector
  var selector = {'$eval':finalCode, 'args':finalParameters};
  // Iterate through all the fields of the index
  new Cursor(this, new Collection(this, DbCommand.SYSTEM_COMMAND_COLLECTION), selector, {}, 0, -1).nextObject(function(err, result) {
    if(result.ok == 1) {
      callback(null, result.retval);
    } else {
      callback(new Error("eval failed: " + result.errmsg), null); return;
    }
  });
};

Db.prototype.dereference = function(dbRef, callback) {
  this.collection(dbRef.namespace, function(err, collection) {
    collection.findOne({'_id':dbRef.oid}, function(err, result) {
      callback(err, result);
    });
  });
};

/**
  Authenticate against server
**/
Db.prototype.authenticate = function(username, password, callback) {
  var self = this;
  // Execute command
  this.executeCommand(DbCommand.createGetNonceCommand(self), function(err, reply) {
    if(err == null) {
      // Nonce used to make authentication request with md5 hash
      var nonce = reply.documents[0].nonce;
      // Execute command
      self.executeCommand(DbCommand.createAuthenticationCommand(self, username, password, nonce), function(err, result) {
        if(err == null && result.documents[0].ok == 1) {
          callback(null, true);
        } else {
          err != null ? callback(err, false) : callback(new Error(result.documents[0].errmsg), false);
        }
      });      
    } else {
      callback(err, null);
    }
  });
};

/**
  Add a user
**/
Db.prototype.addUser = function(username, password, callback) {
  var userPassword = MD5.hex_md5(username + ':mongo:' + password);
  // Fetch a user collection
  this.collection(DbCommand.SYSTEM_USER_COLLECTION, function(err, collection) {
    // Insert the user into the system users collections
    collection.insert({user: username, pwd: userPassword}, function(err, documents) {
      callback(err, documents);
    });
  });
};

/**
  Remove a user
**/
Db.prototype.removeUser = function(username, callback) {
  // Fetch a user collection
  this.collection(DbCommand.SYSTEM_USER_COLLECTION, function(err, collection) {
    collection.findOne({user: username}, function(err, user) {
      if(user != null) {
        collection.remove({user: username}, function(err, result) {
          callback(err, true);
        });
      } else {
        callback(err, false);
      }
    });
  });
};

/**
  Logout user (if authenticated)
**/
Db.prototype.logout = function(callback) {
  this.executeCommand(DbCommand.createLogoutCommand(this), callback);
};

/**
  Create Collection
**/
Db.prototype.createCollection = function(collectionName, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  options = args.length ? args.shift() : null;

  var self = this;
  // Check if we have the name
  this.collectionNames(collectionName, function(err, collections) {
    var found = false;
    collections.forEach(function(collection) {
      if(collection.name == self.databaseName + "." + collectionName) found = true;
    });

    // If the collection exists either throw an exception (if db in strict mode) or return the existing collection
    if(found && self.strict) {
      callback(new Error("Collection " + collectionName + " already exists. Currently in strict mode."), null); return;
    } else if(found){
      callback(null, new Collection(self, collectionName, self.pkFactory)); return;
    }

    // Create a new collection and return it
    self.executeCommand(DbCommand.createCreateCollectionCommand(self, collectionName, options), function(err, result) {
      if(err == null && result.documents[0].ok == 1) {
        callback(null, new Collection(self, collectionName, self.pkFactory));
      } else {
        err != null ? callback(err, null) : callback(new Error("Error creating collection: " + collectionName), null);
      }
    });
  });
};

Db.prototype.command = function(selector, callback) {
  var cursor = new Cursor(this, new Collection(this, DbCommand.SYSTEM_COMMAND_COLLECTION), selector, {}, 0, -1, null, null, null, null, QueryCommand.OPTS_NO_CURSOR_TIMEOUT);
  cursor.nextObject(callback);
};

/**
  Drop Collection
**/
Db.prototype.dropCollection = function(collectionName, callback) {
  this.executeCommand(DbCommand.createDropCollectionCommand(this, collectionName), function(err, result) {
    if(err == null && result.documents[0].ok == 1) {
      if(callback != null) return callback(null, true);
    } else {
      if(callback != null) err != null ? callback(err, null) : callback(new Error(result.documents[0].errmsg), null);
    }
  });
};

/**
  Rename Collection
**/
Db.prototype.renameCollection = function(fromCollection, toCollection, callback) {
  this.executeCommand(DbCommand.createRenameCollectionCommand(this, fromCollection, toCollection), function(err, doc) { callback(err, doc); });
};

/**
  Return last error message for the given connection
**/
Db.prototype.lastError = function(callback) {
  this.executeCommand(DbCommand.createGetLastErrorCommand(this), function(err, error) {
    callback(err, error.documents);
  });
};

Db.prototype.error = function(callback) {
  this.lastError(callback);
};

/**
  Return the status for the last operation on the given connection
**/
Db.prototype.lastStatus = function(callback) {
  this.executeCommand(DbCommand.createGetLastStatusCommand(this), callback);
};

/**
  Return all errors up to the last time db reset_error_history was called
**/
Db.prototype.previousErrors = function(callback) {
  this.executeCommand(DbCommand.createGetPreviousErrorsCommand(this), function(err, error) {
    callback(err, error.documents);
  });
};

/**
  Runs a command on the database
**/
Db.prototype.executeDbCommand = function(command_hash, callback) {
  this.executeCommand(DbCommand.createDbCommand(this, command_hash), callback);
};

/**
  Resets the error history of the mongo instance
**/
Db.prototype.resetErrorHistory = function(callback) {
  this.executeCommand(DbCommand.createResetErrorHistoryCommand(this), callback);
};

/**
  Create an index on a collection
**/
Db.prototype.createIndex = function(collectionName, fieldOrSpec, unique, callback) {
  if(callback == null) { callback = unique; unique = null; }
  var command = DbCommand.createCreateIndexCommand(this, collectionName, fieldOrSpec, unique);
  this.executeCommand(command, function(result) {});
  callback(null, command.documents[0].name);
};

/**
  Ensure index, create an index if it does not exist
**/
Db.prototype.ensureIndex = function(collectionName, fieldOrSpec, unique, callback) {
  if(callback == null) { callback = unique; unique = null; }
  var command = DbCommand.createCreateIndexCommand(this, collectionName, fieldOrSpec, unique);
  var index_name = command.documents[0].name;
  var self = this;
  // Check if the index allready exists
  this.indexInformation(collectionName, function(err, collectionInfo) {
    if(!collectionInfo[index_name]) self.executeCommand(command, function(result) {});
    return callback(null, index_name);
  });
};

/**
  Fetch the cursor information
**/
Db.prototype.cursorInfo = function(callback) {
  this.executeCommand(DbCommand.createDbCommand(this, {'cursorInfo':1}), function(err, result) {
    callback(err, result.documents[0]);
  });
};

/**
  Drop Index on a collection
**/
Db.prototype.dropIndex = function(collectionName, indexName, callback) {
  this.executeCommand(DbCommand.createDropIndexCommand(this, collectionName, indexName), callback);
};

/**
  Index Information
**/
Db.prototype.indexInformation = function(collectionName, callback) {
  if(typeof collectionName === "function") { callback = collectionName; collectionName = null;}
  // Build selector for the indexes
  var selector = collectionName != null ? {ns: (this.databaseName + "." + collectionName)} : {};
  var info = {};
  // Iterate through all the fields of the index
  new Cursor(this, new Collection(this, DbCommand.SYSTEM_INDEX_COLLECTION), selector).each(function(err, index) {
    // Return the info when finished
    if(index == null) {
      callback(null, info);
    } else {
      info[index.name] = [];
      for(var name in index.key) {
        info[index.name].push([name, index.key[name]]);
      }
    }
  });
};

/**
  Database Drop Command
**/
Db.prototype.dropDatabase = function(callback) {
  this.executeCommand(DbCommand.createDropDatabaseCommand(this), function(err, result) {
    callback(err, result);
  });
};

/**
  Execute db command
**/
Db.prototype.executeCommand = function(db_command, callback) {
    var self = this;
    if(callback instanceof Function) {
      // Add the callback to the list of callbacks by the request id (mapping outgoing messages to correct callbacks)
      this.addListener(db_command.getRequestId().toString(), callback);    
      if ( self.serverConfig.masterConnection != null ) {
	      this.notReplied[db_command.getRequestId().toString()] = self.serverConfig.masterConnection;
	    }
    }

    // Correctly handle serialization errors
    var checkMasterHandler = function(err, reply, dbinstance){ 
      if (err == null){
        try{ 
          if ( dbinstance.backup.server ) { // use slave this ONE time 
	          self.notReplied[db_command.getRequestId().toString()] = dbinstance.backup.server.connection;
            dbinstance.backup.server.connection.send( db_command);
            dbinstance.backup.server = null;
          } else {
	          self.notReplied[db_command.getRequestId().toString()] = dbinstance.serverConfig.masterConnection;
            dbinstance.serverConfig.masterConnection.send(db_command);          
          }
        } catch ( err ) {
          // Clean up callback if it exists
          if(this.notReplied[db_command.getRequestId().toString()] != null) {
            delete self.notReplied[db_command.getRequestId().toString()];                    
          }
          
          if(callback instanceof Function) {
            return callback(err, null);
          }          
        }
      } else {
        // XXX : LOOP!!!!!!
        setTimeout( self.checkMaster_(self, checkMasterHandler), 50 );
      }
    };
    
    try{
      self.serverConfig.masterConnection.send(db_command);   
    } catch(err){
      if(callback instanceof Function) {        
        delete self.notReplied[db_command.getRequestId().toString()];        
        return callback(err, null);
      }

      // Return error object
      return err;
    }
};

/**
  Connect to URL
**/
Db.DEFAULT_URL = 'mongo://localhost:27017/default';

exports.connect = function(url, callback) {
  config = require('url').parse(url || Db.DEFAULT_URL);

  if (!config['protocol'].match(/^mongo/))
    throw Error("URL must be in the format mongo://user:pass@host:port/dbname");

  var host = config['hostname'] || 'localhost';
  var port = config['port'] || Connection.DEFAULT_PORT;
  var dbname = config['pathname'].replace(/^\//, '');

  if (config['auth']){
    var auth = config['auth'].split(':', 2);
  }

  var db = new Db(dbname, new Server(host, port, {}), {});
  db.open(function(err, db){
    if(!err && auth){
      db.authenticate(auth[0], auth[1], function(err, success){
        if(success){
          callback(null, db);
        }
        else {
          callback(err ? err : new Error('Could not authenticate user ' + user), null);
        }
      });
    } else {
      callback(err, db);
    }
  });
}


/**
* Checks for latest master by calling isMasterCommand on each server
* of serverConfig
* @param dbcopy{instance of db}
*
**/
Db.prototype.checkMaster_ = function(dbcopy, returnback) {
  var self = dbcopy;
  var hasReturned = false;
  var answers = 0;
  dbcopy.backup = {};  
  var servers = dbcopy.serverConfig.servers;
  
  if(Array.isArray(servers)) {
    for(var serveri = 0; serveri < servers.length; serveri++) {      
      var server = servers[serveri];
      server.master = false;
      
      if(server.connection.connection.readyState == "open" || server.connection.autoReconnect) {
        var db_cmnd = DbCommand.createIsMasterCommand(dbcopy);
        var connect_Callback = function(err, reply) {        
          if(err != null) {
            if (!hasReturned && ( ++answers == dbcopy.serverConfig.servers.length)) {
              if (dbcopy.backup.server && dbcopy.backup.reply) { 
                dbcopy.masterConnection = dbcopy.backup.server.connection;
                return returnback( null, dbcopy.backup.reply, dbcopy );
              } else {
                return returnback( new Error( 'No master found' ) );
              }
            }
          } else {           
            if(reply.documents[0].ismaster == 1) {
              // Locate the master connection and save it
              dbcopy.masterConnection = server.connection;
              server.master = true;
              hasReturned = true;
              return returnback(null, reply, dbcopy);
            } else {
              server.master = false;
              // we may not have a master so we keep a secondary server,
              // that is able to respond, just in case
              dbcopy.backup.server = server;
              dbcopy.backup.reply = reply;
              if ( !hasReturned && ( ++answers == dbcopy.serverConfig.servers.length )) {
                if ( dbcopy.backup.server && dbcopy.backup.reply ) { 
                  dbcopy.masterConnection = dbcopy.backup.server.connection;
                  return returnback( null, dbcopy.backup.reply, dbcopy );
                } else {
                  return returnback(new Error( 'No master found' ));
                }
              }
            }         
          }
        }
      
        dbcopy.addListener(db_cmnd.getRequestId().toString(), connect_Callback);
        self.notReplied[db_cmnd.getRequestId().toString()] = server.connection;  
      
        if(server.connection.connection.readyState == "open") {
          server.connection.sendwithoutReconnect(db_cmnd); 
        } else {
           // This if it's closed it may not have a listener
          // The listener is of general use so we need not use one for every command
          if (!server.connection.listeners("data").length) { 
            server.connection.addListener("data", function(message) {
              // Parse the data as a reply object
              var reply = null;    
              if ( message ) {
                reply = new MongoReply(self, message);
              } else {
                reply = {};
                reply.responseHasError = true;
                reply.documents = ['Error connecting'];
              }
              // Emit error if there is one       
              reply.responseHasError ? self.emit(reply.responseTo.toString(), reply.documents[0], reply) : self.emit(reply.responseTo.toString(), null, reply);
              // Remove the listener
              if(self.notReplied[ reply.responseTo.toString()]) {
                delete self.notReplied[ reply.responseTo.toString()];
                self.removeListener(reply.responseTo.toString(), self.listeners( reply.responseTo.toString())[0]);
              }
            });
          }
      
          if (server.connection.listeners("error").length == 0) {
            server.connection.addListener("error", function(err) {
              dbcopy.emit("error", err);
              server.master = false;
            });      
          }
          
          // Emit timeout and close events so the client using db can figure do proper error handling (emit contains the connection that triggered the event)
          if (server.connection.listeners("timeout").length == 0) {
            server.connection.addListener("timeout", function() { dbcopy.emit("timeout", this); });          
          }
          
          if (server.connection.listeners("close").length == 0) {
            server.connection.addListener("close", function() { dbcopy.emit("close", this); });          
          }
          
          server.connection.send(db_cmnd); 
        } 
      } else {
        server.master = false;
      
        if (!hasReturned && ( ++answers == dbcopy.serverConfig.servers.length)) {
          if (dbcopy.backup.server && dbcopy.backup.reply) { 
            dbcopy.masterConnection = dbcopy.backup.server.connection;
            return returnback( null, dbcopy.backup.reply, dbcopy );
          } else {
            return returnback( new Error( 'No master found' ) );
          }
        }
      }
    }          
  }
}
