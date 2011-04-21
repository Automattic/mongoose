var QueryCommand = require('./query_command').QueryCommand,
  InsertCommand = require('./insert_command').InsertCommand,
  MD5 = require('../crypto/md5').MD5,
  inherits = require('sys').inherits;

/**
  Db Command
**/
var DbCommand = exports.DbCommand = function(db, collectionName, queryOptions, numberToSkip, numberToReturn, query, returnFieldSelector) {
  QueryCommand.call(db, this);

  this.collectionName = collectionName;
  this.queryOptions = queryOptions;
  this.numberToSkip = numberToSkip;
  this.numberToReturn = numberToReturn;
  this.query = query;
  this.returnFieldSelector = returnFieldSelector;
  this.db = db;
};

inherits(DbCommand, QueryCommand);

// Constants
DbCommand.SYSTEM_NAMESPACE_COLLECTION = "system.namespaces";
DbCommand.SYSTEM_INDEX_COLLECTION = "system.indexes";
DbCommand.SYSTEM_PROFILE_COLLECTION = "system.profile";
DbCommand.SYSTEM_USER_COLLECTION = "system.users";
DbCommand.SYSTEM_COMMAND_COLLECTION = "$cmd";

// Provide constructors for different db commands
DbCommand.createIsMasterCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'ismaster':1}, null);
};

DbCommand.createCollectionInfoCommand = function(db, selector) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_NAMESPACE_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, 0, selector, null);
};

DbCommand.createGetNonceCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getnonce':1}, null);
};

DbCommand.createAuthenticationCommand = function(db, username, password, nonce) {
  // Generate keys used for authentication
  var hash_password = MD5.hex_md5(username + ":mongo:" + password);
  var key = MD5.hex_md5(nonce + username + hash_password);
  var selector = {'authenticate':1, 'user':username, 'nonce':nonce, 'key':key};
  // Create db command
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, selector, null);
};

DbCommand.createLogoutCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'logout':1}, null);
};

DbCommand.createCreateCollectionCommand = function(db, collectionName, options) {
  var selector = {'create':collectionName};
  // Modify the options to ensure correct behaviour
  for(var name in options) {
    if(options[name] != null && options[name].constructor != Function) selector[name] = options[name];
  }
  // Execute the command
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, selector, null);
};

DbCommand.createDropCollectionCommand = function(db, collectionName) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'drop':collectionName}, null);
};

DbCommand.createRenameCollectionCommand = function(db, fromCollectionName, toCollectionName) {
  var renameCollection = db.databaseName + "." + fromCollectionName;
  var toCollection = db.databaseName + "." + toCollectionName;
  return new DbCommand(db, "admin." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'renameCollection':renameCollection, 'to':toCollection}, null);
};

DbCommand.createGetLastErrorCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getlasterror':1}, null);
};

DbCommand.createGetLastStatusCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getlasterror':1}, null);
};

DbCommand.createGetPreviousErrorsCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getpreverror':1}, null);
};

DbCommand.createResetErrorHistoryCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'reseterror':1}, null);
};

DbCommand.createCreateIndexCommand = function(db, collectionName, fieldOrSpec, unique) {
  var finalUnique = unique == null ? false : unique;
  var fieldHash = {};
  var indexes = [];
  var keys;

  // Get all the fields accordingly
  if (fieldOrSpec.constructor === String) {             // 'type'
    indexes.push(fieldOrSpec + '_' + 1);
    fieldHash[fieldOrSpec] = 1;
  } else if (fieldOrSpec.constructor === Array) {       // [{location:'2d'}, ...]
    fieldOrSpec.forEach(function(f) {
      if (f.constructor === String) {                   // [{location:'2d'}, 'type']
        indexes.push(f + '_' + 1);
        fieldHash[f] = 1;
      } else if (f.constructor === Array) {             // [['location', '2d'],['type', 1]]
        indexes.push(f[0] + '_' + (f[1] || 1));
        fieldHash[f[0]] = f[1] || 1;
      } else if (f.constructor === Object) {            // [{location:'2d'}, {type:1}]
        keys = Object.keys(f);
        keys.forEach(function(k) {
          indexes.push(k + '_' + f[k]);
          fieldHash[k] = f[k];
      });
      } else {
        // undefined
      }
    });
  } else if (fieldOrSpec.constructor === Object) {  // {location:'2d', type:1}
    keys = Object.keys(fieldOrSpec);
    keys.forEach(function(key) {
      indexes.push(key + '_' + fieldOrSpec[key]);
      fieldHash[key] = fieldOrSpec[key];
    });
  } else {
    // undefined
  }
  
  // Generate the index name
  var indexName = indexes.join("_");
  // Build the selector
  var selector = {'ns':(db.databaseName + "." + collectionName), 'unique':finalUnique, 'key':fieldHash, 'name':indexName};
  // Create the insert command for the index and return the document
  return new InsertCommand(db, db.databaseName + "." + DbCommand.SYSTEM_INDEX_COLLECTION, false).add(selector);
};

DbCommand.createDropIndexCommand = function(db, collectionName, indexName) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'deleteIndexes':collectionName, 'index':indexName}, null);
};

DbCommand.createDropDatabaseCommand = function(db) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'dropDatabase':1}, null);
};

DbCommand.createDbCommand = function(db, command_hash) {
  return new DbCommand(db, db.databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, command_hash, null);
};
