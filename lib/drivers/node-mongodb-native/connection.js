/*!
 * Module dependencies.
 */

var MongooseConnection = require('../../connection')
  , mongo = require('mongodb')
  , Server = mongo.Server
  , ReplSetServers = mongo.ReplSetServers;

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) connection implementation.
 *
 * @inherits Connection
 * @api private
 */

function NativeConnection() {
  MongooseConnection.apply(this, arguments);
};

/*!
 * Inherits from Connection.
 */

NativeConnection.prototype.__proto__ = MongooseConnection.prototype;

/**
 * Opens the connection to MongoDB.
 *
 * @param {Function} fn
 * @return {Connection} this
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
 * See description of [doOpen](#NativeConnection-doOpen) for server options. In this case `options.replset` is also passed to ReplSetServers.
 *
 * @param {Function} fn
 * @api private
 * @returns {Connection} this
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
 * @returns {Connection} this
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
