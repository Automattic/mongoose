/*!
 * Module dependencies.
 */

var MongooseConnection = require('../../connection');
var STATES = require('../../connectionstate');

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) connection implementation.
 *
 * @inherits Connection
 * @api private
 */

function NativeConnection() {
  MongooseConnection.apply(this, arguments);
  this._listening = false;
}

/**
 * Expose the possible connection states.
 * @api public
 */

NativeConnection.STATES = STATES;

/*!
 * Inherits from Connection.
 */

NativeConnection.prototype.__proto__ = MongooseConnection.prototype;

/**
 * Switches to a different database using the same connection pool.
 *
 * Returns a new connection object, with the new db.
 *
 * @param {String} name The database name
 * @return {Connection} New Connection Object
 * @api public
 */

NativeConnection.prototype.useDb = function(name, options) {
  // Return immediately if cached
  if (options && options.useCache && this.relatedDbs[name]) {
    return this.relatedDbs[name];
  }

  // we have to manually copy all of the attributes...
  var newConn = new this.constructor();
  newConn.name = name;
  newConn.base = this.base;
  newConn.collections = {};
  newConn.models = {};
  newConn.replica = this.replica;
  newConn.name = this.name;
  newConn.options = this.options;
  newConn._readyState = this._readyState;
  newConn._closeCalled = this._closeCalled;
  newConn._hasOpened = this._hasOpened;
  newConn._listening = false;

  newConn.host = this.host;
  newConn.port = this.port;
  newConn.user = this.user;
  newConn.pass = this.pass;

  // First, when we create another db object, we are not guaranteed to have a
  // db object to work with. So, in the case where we have a db object and it
  // is connected, we can just proceed with setting everything up. However, if
  // we do not have a db or the state is not connected, then we need to wait on
  // the 'open' event of the connection before doing the rest of the setup
  // the 'connected' event is the first time we'll have access to the db object

  var _this = this;

  newConn.client = _this.client;

  if (this.db && this._readyState === STATES.connected) {
    wireup();
  } else {
    this.once('connected', wireup);
  }

  function wireup() {
    newConn.client = _this.client;
    newConn.db = _this.client.db(name);
    newConn.onOpen();
    // setup the events appropriately
    listen(newConn);
  }

  newConn.name = name;

  // push onto the otherDbs stack, this is used when state changes
  this.otherDbs.push(newConn);
  newConn.otherDbs.push(this);

  // push onto the relatedDbs cache, this is used when state changes
  if (options && options.useCache) {
    this.relatedDbs[newConn.name] = newConn;
    newConn.relatedDbs = this.relatedDbs;
  }

  return newConn;
};

/*!
 * Register listeners for important events and bubble appropriately.
 */

function listen(conn) {
  if (conn.db._listening) {
    return;
  }
  conn.db._listening = true;

  conn.db.on('close', function(force) {
    if (conn._closeCalled) return;

    // the driver never emits an `open` event. auto_reconnect still
    // emits a `close` event but since we never get another
    // `open` we can't emit close
    if (conn.db.serverConfig.autoReconnect) {
      conn.readyState = STATES.disconnected;
      conn.emit('close');
      return;
    }
    conn.onClose(force);
  });
  conn.db.on('error', function(err) {
    conn.emit('error', err);
  });
  conn.db.on('reconnect', function() {
    conn.readyState = STATES.connected;
    conn.emit('reconnect');
    conn.emit('reconnected');
    conn.onOpen();
  });
  conn.db.on('timeout', function(err) {
    conn.emit('timeout', err);
  });
  conn.db.on('open', function(err, db) {
    if (STATES.disconnected === conn.readyState && db && db.databaseName) {
      conn.readyState = STATES.connected;
      conn.emit('reconnect');
      conn.emit('reconnected');
    }
  });
  conn.db.on('parseError', function(err) {
    conn.emit('parseError', err);
  });
}

/**
 * Closes the connection
 *
 * @param {Boolean} [force]
 * @param {Function} [fn]
 * @return {Connection} this
 * @api private
 */

NativeConnection.prototype.doClose = function(force, fn) {
  this.client.close(force, fn);
  return this;
};

/*!
 * Module exports.
 */

module.exports = NativeConnection;
