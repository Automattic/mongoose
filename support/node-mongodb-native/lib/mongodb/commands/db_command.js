var QueryCommand = require('./query_command').QueryCommand,
  InsertCommand = require('./insert_command').InsertCommand,
  OrderedHash = require('../bson/collections').OrderedHash,
  MD5 = require('../crypto/md5').MD5,
  inherits = require('sys').inherits;

/**
  Db Command
**/
var DbCommand = exports.DbCommand = function(collectionName, queryOptions, numberToSkip, numberToReturn, query, returnFieldSelector) {
  QueryCommand.call(this);

  this.collectionName = collectionName;
  this.queryOptions = queryOptions;
  this.numberToSkip = numberToSkip;
  this.numberToReturn = numberToReturn;
  this.query = query;
  this.returnFieldSelector = returnFieldSelector;
};

inherits(DbCommand, QueryCommand);

// Constants
DbCommand.SYSTEM_NAMESPACE_COLLECTION = "system.namespaces";
DbCommand.SYSTEM_INDEX_COLLECTION = "system.indexes";
DbCommand.SYSTEM_PROFILE_COLLECTION = "system.profile";
DbCommand.SYSTEM_USER_COLLECTION = "system.users";
DbCommand.SYSTEM_COMMAND_COLLECTION = "$cmd";

// Provide constructors for different db commands
DbCommand.createIsMasterCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'ismaster':1}, null);
};

DbCommand.createCollectionInfoCommand = function(databaseName, selector) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_NAMESPACE_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, 0, selector, null);
};

DbCommand.createGetNonceCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getnonce':1}, null);
};

DbCommand.createAuthenticationCommand = function(databaseName, username, password, nonce) {
  // Generate keys used for authentication
  var hash_password = MD5.hex_md5(username + ":mongo:" + password);
  var key = MD5.hex_md5(nonce + username + hash_password);
  var selector = {'authenticate':1, 'user':username, 'nonce':nonce, 'key':key};
  // Create db command
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, selector, null);
};

DbCommand.createLogoutCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'logout':1}, null);
};

DbCommand.createCreateCollectionCommand = function(databaseName, collectionName, options) {
  var selector = {'create':collectionName};
  // Modify the options to ensure correct behaviour
  for(var name in options) {
    if(options[name] != null && options[name].constructor != Function) selector[name] = options[name];
  }
  // Execute the command
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, selector, null);
};

DbCommand.createDropCollectionCommand = function(databaseName, collectionName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'drop':collectionName}, null);
};

DbCommand.createRenameCollectionCommand = function(databaseName, fromCollectionName, toCollectionName) {
  var renameCollection = databaseName + "." + fromCollectionName;
  var toCollection = databaseName + "." + toCollectionName;
  return new DbCommand("admin." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'renameCollection':renameCollection, 'to':toCollection}, null);
};

DbCommand.createGetLastErrorCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getlasterror':1}, null);
};

DbCommand.createGetLastStatusCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getlasterror':1}, null);
};

DbCommand.createGetPreviousErrorsCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'getpreverror':1}, null);
};

DbCommand.createResetErrorHistoryCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'reseterror':1}, null);
};

DbCommand.createCreateIndexCommand = function(databaseName, collectionName, fieldOrSpec, unique) {
  var finalUnique = unique == null ? false : unique;
  var fieldHash = {};
  var finalFieldOrSpec = fieldOrSpec.constructor == String ? [[fieldOrSpec, 1]] : fieldOrSpec;
  var indexes = [];

  // Get all the fields
  finalFieldOrSpec.forEach(function(indexArray) {
    var indexArrayFinal = indexArray;
    if(indexArrayFinal.length == 1) indexArrayFinal[1] = 1;
    fieldHash[indexArrayFinal[0]] = indexArrayFinal[1];
    indexes.push(indexArrayFinal[0] + "_" + indexArrayFinal[1]);
  });
  // Generate the index name
  var indexName = indexes.join("_");
  // Build the selector
  var selector = {'ns':(databaseName + "." + collectionName), 'unique':finalUnique, 'key':fieldHash, 'name':indexName};
  // Create the insert command for the index and return the document
  return new InsertCommand(databaseName + "." + DbCommand.SYSTEM_INDEX_COLLECTION, false).add(selector);
};

DbCommand.createDropIndexCommand = function(databaseName, collectionName, indexName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'deleteIndexes':collectionName, 'index':indexName}, null);
};

DbCommand.createDropDatabaseCommand = function(databaseName) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, {'dropDatabase':1}, null);
};

DbCommand.createDbCommand = function(databaseName, command_hash) {
  return new DbCommand(databaseName + "." + DbCommand.SYSTEM_COMMAND_COLLECTION, QueryCommand.OPTS_NO_CURSOR_TIMEOUT, 0, -1, command_hash, null);
};
