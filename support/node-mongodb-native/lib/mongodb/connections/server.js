var Connection = require('../connection').Connection,
  DbCommand = require('../commands/db_command').DbCommand,
  MongoReply = require('../responses/mongo_reply').MongoReply,
  EventEmitter = require("events").EventEmitter,
  inherits = require('util').inherits,
  debug = require('util').debug,
  inspect = require('util').inspect;

var Server = exports.Server = function(host, port, options) {
  EventEmitter.call(this);
  var self = this;
  this.host = host;
  this.port = port;
  this.options = options == null ? {} : options;
  this.internalConnection;
  this.internalMaster = false;
  this.connected = false;
  this.poolSize = this.options.poolSize == null ? 1 : this.options.poolSize;
  this.auths = [];
  // Setters and getters
  this.__defineGetter__("autoReconnect", function() { return self.options['auto_reconnect'] == null ? false : this.options['auto_reconnect']; });
  this.__defineGetter__("connection", function() { return self.internalConnection; });
  this.__defineSetter__("connection", function(connection) { self.internalConnection = connection; });
  this.__defineGetter__("master", function() { return self.internalMaster; });
  this.__defineSetter__("master", function(value) { self.internalMaster = value; });
  this.__defineGetter__("primary", function() { return self; });
};

inherits(Server, EventEmitter);

Server.prototype.close = function(callback) {
  this.connected = false;
  this.internalMaster = false;
  // Close the internal connection
  this.internalConnection.close(callback);
};

Server.prototype.send = function(command) {
  this.internalConnection.send(command);     
}

Server.prototype.isConnected = function() {
  return this.connected;
}

Server.prototype.connect = function(parent, callback) {
  var server = this;
  server.connection = new Connection(this.host, this.port, this.autoReconnect, {poolSize:this.poolSize});  
  server.connection.on("connect", function() {
    // Create a callback function for a given connection
    var connectCallback = function(err, reply) {   
      if(err != null) return callback(err, null);
      server.master = reply.documents[0].ismaster == 1 ? true : false;
      // Set server as connected
      server.connected = true;
                        
      // emit a message saying we got a master and are ready to go and change state to reflect it
      if(parent.state == 'notConnected') {
        parent.state = 'connected';
        // 
        // Call the server version function via admin to adapt to changes from 1.7.6 >
        var admindb = parent.admin()
        admindb.serverInfo(function(err, doc) {
          if(err != null) return callback(err, null);
          // Store the db version
          parent.version = doc.version;
          callback(null, parent);
        });
      } else {
        callback("connection already opened");
      }
    };

    // Create db command and Add the callback to the list of callbacks by the request id (mapping outgoing messages to correct callbacks)
    var db_command = DbCommand.createIsMasterCommand(parent);
    // Add listeners
    parent.on(db_command.getRequestId().toString(), connectCallback);
    parent.notReplied[db_command.getRequestId().toString()] = this;	
    
    // Let's send a request to identify the state of the server
    this.send(db_command);
  });
  
  server.connection.on("data", function(message) {
    // Parse the data as a reply object
    var reply = new MongoReply(parent, message);
    // Emit message
    parent.emit(reply.responseTo.toString(), null, reply);
    // Remove the listener
    if(parent.notReplied[reply.responseTo.toString()]) {
      delete parent.notReplied[reply.responseTo.toString()];
      parent.removeListener(reply.responseTo.toString(), parent.listeners(reply.responseTo.toString())[0]);
    }
  });
  
  server.connection.on("reconnect", function(err) {
    parent.emit("reconnect");
  });
  
  server.connection.on("error", function(err) {
    if(parent.listeners("error") != null && parent.listeners("error").length > 0) parent.emit("error", err);
    parent.state = "notConnected"
    server.connected = false;
    return callback(err, null);
  });
  
  // Emit timeout and close events so the client using db can figure do proper error handling (emit contains the connection that triggered the event)
  server.connection.on("timeout", function() { parent.emit("timeout", this); });
  server.connection.on("close", function() { 
    server.connected = false;    
    parent.emit("close", this); 
  });
  // Open the connection
  server.connection.open();  
}

Server.prototype.allRawConnections = function() {
  return this.checkoutWriter().pool.slice(0);
}

Server.prototype.checkoutWriter = function() {
  return this.connection;
}

Server.prototype.checkoutReader = function() {
  return this.connection;
}