/*!
 * Module dependencies.
 */

var Connection = require('../../connection')
  , mongo = require('mongodb')
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

/*!
 * Inherits from Connection.
 */

NativeConnection.prototype.__proto__ = Connection.prototype;

/**
 * Opens the connection to MongoDB.
 *
 * Example server options:
 *
 *    auto_reconnect (default: false)
 *    poolSize (default: 1)
 *
 * Example db options:
 *
 *    pk - custom primary key factory to generate `_id` values
 *
 * Some of these options may break Mongoose.
 * Use at your own risk. You have been warned.
 *
 * @param {Function} fn
 * @api private
 */

NativeConnection.prototype.doOpen = function (fn) {
  var server;

  if (!this.db) {
    server = new mongo.Server(this.host, Number(this.port), this.options.server);
    this.db = new mongo.Db(this.name, server, this.options.db);
  }

  this.db.open(fn);

  return this;
};

/**
 * Opens a connection to a MongoDB ReplicaSet.
 *
 * See description of doOpen for server options. In this case options.replset
 * is also passed to ReplSetServers.
 *
 * @param {Function} fn
 * @api private
 */

NativeConnection.prototype.doOpenSet = function (fn) {
  if (!this.db) {
    var servers = []
      , ports = this.port
      , self = this

    this.host.forEach(function (host, i) {
      servers.push(new mongo.Server(host, Number(ports[i]), self.options.server));
    });

    var server = new ReplSetServers(servers, this.options.replset);
    this.db = new mongo.Db(this.name, server, this.options.db);
  }

  this.db.open(fn);

  return this;
};

/**
 * Closes the connection
 *
 * @param {Function} fn
 * @api private
 */

NativeConnection.prototype.doClose = function (fn) {
  this.db.close();
  if (fn) fn();
  return this;
}

/*!
 * Module exports.
 */

module.exports = NativeConnection;
