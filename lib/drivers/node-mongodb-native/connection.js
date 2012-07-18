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
 * doOpen
 *
 * Opens the connection.
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
    listen(this);
  }

  this.db.openCalled = false;
  this.db.open(fn);

  return this;
};

function listen (conn) {
  conn.db.on('close', function(){
    if (conn._closeCalled) return;

    // the driver never emits an `open` event. auto_reconnect still
    // emits a `close` event but since we never get another
    // `open` we can't emit close
    if (conn.options.server.auto_reconnect) return;
    conn.onClose();
  });
  conn.db.on('error', function(err){
    conn.emit('error', err);
  });
  conn.db.on('timeout', function(err){
    var error = new Error(err && err.err || 'connection timeout');
    conn.emit('error', error);
  });
}

/**
 * doOpenSet
 *
 * Opens a set connection
 *
 * See description of doOpen for server options. In this case options.replset
 * is also passed to ReplSetServers. Some additional options there are
 *
 *     reconnectWait (default: 1000)
 *     retries (default: 30)
 *     rs_name (default: false)
 *     read_secondary (default: false) Are reads allowed from secondaries?
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
    listen(this);
  }

  this.db.open(fn);

  return this;
};

/**
 * doClose
 *
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

/**
 * Module exports.
 * @api private
 */

module.exports = NativeConnection;
