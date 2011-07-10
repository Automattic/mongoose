/**
 * Module dependencies.
 */

var Connection = require('../../connection')
  , mongo = require('../../../../support/node-mongodb-native/lib/mongodb/')
  , Server = mongo.Server
  , ReplSetServers = mongo.ReplSetServers;

/**
 * Connection for mongodb-native driver
 *
 * @api private
 */

function NativeConnection() {
  Connection.apply(this, arguments);
};

/**
 * Inherits from Connection.
 */

NativeConnection.prototype.__proto__ = Connection.prototype;

/**
 * Opens the connection
 * 
 * The openOptions configured for the connection are passed to both the mongo.Server
 * constructor as well as to the mongo.Db constructor.
 * 
 * From the mongodb module, interesting options are 
 * 
 *     For the server
 *         auto_reconnect (default: false)
 *         poolSize (default: 1)
 * 
 *     For the Db
 *         `native_parser` - if true, use native BSON parser 
 *         `strict` - sets *strict mode*, if true then existing collections can't be "recreated" etc.
 *         `pk` - custom primary key factory to generate `_id` values (see Custom primary keys).
 *         `forceServerObjectId` - generation of objectid is delegated to the mongodb server instead of the driver. default is false
 * 
 * Some of these may break mongoose. Use at your own risk. You have been warned.
 * 
 * @param {Function} callback
 * @api private
 */

NativeConnection.prototype.doOpen = function (fn) {  
  if (!this.db)
    this.db = new mongo.Db(this.name, new mongo.Server(this.host, this.port, this.openOptions), this.openOptions);

  this.db.open(fn);

  return this;
};

/**
 * Opens a set connection
 * 
 * See description of doOpen for openOptions. In this case the options are also passed
 * to ReplSetServers. The additional options there are
 * 
 *     reconnectWait (default: 1000)
 *     retries (default: 30)
 *     rs_name (default: false)
 *     read_secondary (default: false) Are reads allowed from secondaries?
 * @param {Function} callback
 * @api private
 */

NativeConnection.prototype.doOpenSet = function (fn) {
  if (!this.db) {
    var servers = []
      , ports = this.port;

    this.host.forEach(function (host, i) {
      servers.push(new mongo.Server(host, ports[i], this.openOptions));
    });

    this.db = new mongo.Db(this.name, new ReplSetServers(servers, this.openOptions), this.openOptions);
  }

  this.db.open(fn);

  return this;
};


/**
 * Closes the connection
 *
 * @param {Function} callback
 * @api private
 */

NativeConnection.prototype.doClose = function (fn) {
  this.db.close();
  if (fn) fn();
  return this;
}

/**
 * Module exports.
 */

module.exports = NativeConnection;
