
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
 * @param {Function} callback
 * @api private
 */

NativeConnection.prototype.doOpen = function (fn) {
  if (!this.db)
    this.db = new mongo.Db(this.name, new mongo.Server(this.host, this.port));

  this.db.open(fn);

  return this;
};

/**
 * Opens a set connection
 *
 * @param {Function} callback
 * @api private
 */

NativeConnection.prototype.doOpenSet = function (fn) {
  if (!this.db) {
    var servers = []
      , ports = this.port;

    this.host.forEach(function (host, i) {
      servers.push(new mongo.Server(host, ports[i], {}));
    });

    this.db = new mongo.Db(this.name, new ReplSetServers(servers));
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
