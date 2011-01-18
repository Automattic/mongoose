var Collection = require('./collection').Collection,
  OrderedHash = require('./bson/collections').OrderedHash,
  Cursor = require('./cursor').Cursor,
  DbCommand = require('./commands/db_command').DbCommand;

var Admin = exports.Admin = function(db) {  
  this.db = db;
};

Admin.prototype.profilingLevel = function(callback) {
  var command = new OrderedHash();
  command.add('profile', -1);
  this.db.executeDbCommand(command, function(err, doc) {
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

Admin.prototype.setProfilingLevel = function(level, callback) {
  var command = new OrderedHash();
  var profile = 0;
  if(level == "off") {
    profile = 0;
  } else if(level == "slow_only") {
    profile = 1;
  } else if(level == "all") {
    profile = 2;
  } else {
    callback(new Error("Error: illegal profiling level value " + level));
    return;
  }
  command.add('profile', profile);

  this.db.executeDbCommand(command, function(err, doc) {
    doc = doc.documents[0];
    if(err == null && (doc.ok == 1 || doc.was.constructor == Numeric)) {
      callback(null, level);
    } else {
      err != null ? callback(err, null) : callback(new Error("Error with profile command"), null);
    }    
  });
};

Admin.prototype.profilingInfo = function(callback) {
  new Cursor(this.db, new Collection(this.db, DbCommand.SYSTEM_PROFILE_COLLECTION), {}).toArray(function(err, items) {
    callback(err, items);
  });  
};

Admin.prototype.validatCollection = function(collectionName, callback) {
  var command = new OrderedHash();
  command.add('validate', collectionName);
  this.db.executeDbCommand(command, function(err, doc) {
    doc = doc.documents[0];

    if(err != null) {
      callback(err, null);
    } else if(doc.ok == 0) {
      callback(new Error("Error with validate command"), null);
    } else if(doc.result.constructor != String) {
      callback(new Error("Error with validation data"), null);
    } else if(doc.result.match(/exception|corrupt/) != null) {
      callback(new Error("Error: invalid collection " + collectionName), null);
    } else {
      callback(null, doc);
    }
  });
};