var Collection = require('./collection').Collection,
    Cursor = require('./cursor').Cursor,
    DbCommand = require('./commands/db_command').DbCommand,
    debug = require('util').debug, 
    inspect = require('util').inspect;

var Admin = exports.Admin = function(db) {  
  this.db = db;
};

Admin.prototype.serverInfo = function(callback) {
  var self = this;
  var command = {buildinfo:1};
  this.command(command, function(err, doc) {
    if(err != null) return callback(err, null);
    return callback(null, doc.documents[0]);
  });
}

Admin.prototype.profilingLevel = function(callback) {
  var self = this;
  var command = {profile:-1};

  this.command(command, function(err, doc) {
    doc = doc.documents[0];

    if(err == null && (doc.ok == 1 || doc.was.constructor == Numeric)) {
      var was = doc.was;
      if(was == 0) {
        callback(null, "off");
      } else if(was == 1) {
        callback(null, "slow_only");
      } else if(was == 2) {
        callback(null, "all");
      } else {
        callback(new Error("Error: illegal profiling level value " + was), null);
      }
    } else {
      err != null ? callback(err, null) : callback(new Error("Error with profile command"), null);
    }
  });
};

Admin.prototype.authenticate = function(username, password, callback) {
  var self = this;

  var databaseName = this.db.databaseName;
  this.db.databaseName = 'admin';
  this.db.authenticate(username, password, function(err, result) {
    self.db.databaseName = databaseName;
    return callback(err, result);
  })
}

Admin.prototype.setProfilingLevel = function(level, callback) {
  var self = this;
  var command = {};
  var profile = 0;

  if(level == "off") {
    profile = 0;
  } else if(level == "slow_only") {
    profile = 1;
  } else if(level == "all") {
    profile = 2;
  } else {
    return callback(new Error("Error: illegal profiling level value " + level));
  }
  command['profile'] = profile;

  this.command(command, function(err, doc) {
    doc = doc.documents[0];
    
    if(err == null && (doc.ok == 1 || doc.was.constructor == Numeric)) {
      return callback(null, level);
    } else {
      return err != null ? callback(err, null) : callback(new Error("Error with profile command"), null);
    }    
  });
};

Admin.prototype.profilingInfo = function(callback) {
  var self = this;
  var databaseName = this.db.databaseName;
  this.db.databaseName = 'admin';

  new Cursor(this.db, new Collection(this.db, DbCommand.SYSTEM_PROFILE_COLLECTION), {}).toArray(function(err, items) {
    return callback(err, items);
  });

  self.db.databaseName = databaseName;
};

Admin.prototype.command = function(command, callback) {
  var self = this;

  // Execute a command
  this.db.executeDbAdminCommand(command, function(err, result) {    
    // Ensure change before event loop executes
    return callback(err, result);
  });
}

Admin.prototype.validateCollection = function(collectionName, callback) {
  var self = this;
  var command = {validate: collectionName};

  this.db.executeDbCommand(command, function(err, doc) {
    if(err != null) return callback(err, null);    
    doc = doc.documents[0];
    
    if(doc.ok == 0) {
      return callback(new Error("Error with validate command"), null);
    } else if(doc.result.constructor != String) {
      return callback(new Error("Error with validation data"), null);
    } else if(doc.result.match(/exception|corrupt/) != null) {
      return callback(new Error("Error: invalid collection " + collectionName), null);
    } else {
      return callback(null, doc);
    }
  });
};
