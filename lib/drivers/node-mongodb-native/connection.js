/*!
 * Module dependencies.
 */

var MongooseConnection = require('../../connection')
  , mongo = require('mongodb')
  , Server = mongo.Server
  , STATES = require('../../connectionstate')
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
  var server
    , self = this;

  if (!this.db) {
    server = new mongo.Server(this.host, Number(this.port), this.options.server);
    this.db = new mongo.Db(this.name, server, this.options.db);
  }

  this.db.open(function (err) {
    if (err) return fn(err);
    fn();
    listen(self);
  });

  return this;
};

function listen (conn) {
  if (conn._listening) return;
  conn._listening = true;

  conn.db.on('close', function(){
    if (conn._closeCalled) return;

    // the driver never emits an `open` event. auto_reconnect still
    // emits a `close` event but since we never get another
    // `open` we can't emit close
    if (conn.db.serverConfig.autoReconnect) {
      conn.readyState = STATES.disconnected;
      conn.emit('close');
      return;
    }
    conn.onClose();
  });
  conn.db.on('error', function(err){
    conn.emit('error', err);
  });
  conn.db.on('timeout', function(err){
    var error = new Error(err && err.err || 'connection timeout');
    conn.emit('error', error);
  });
  conn.db.on('open', function (err, db) {
    if (STATES.disconnected === conn.readyState && db && db.databaseName) {
      conn.readyState = STATES.connected;
      conn.emit('reconnected')
    }
  })
}

/**
 * Opens a connection to a MongoDB ReplicaSet.
 *
 * See description of [doOpen](#NativeConnection-doOpen) for server options. In this case `options.replset` is also passed to ReplSetServers.
 *
 * @param {Function} fn
 * @api private
 * @return {Connection} this
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

    this.db.on('fullsetup', function () {
      self.emit('fullsetup')
    });
  }

  this.db.open(function (err) {
    if (err) return fn(err);
    fn();
    listen(self);
  });

  return this;
};

/**
 * Closes the connection
 *
 * @param {Function} fn
 * @return {Connection} this
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
