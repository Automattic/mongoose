/*!
 * Module dependencies.
 */

var MongooseConnection = require('../../connection');
var mongo = require('mongodb');
var Db = mongo.Db;
var Server = mongo.Server;
var Mongos = mongo.Mongos;
var STATES = require('../../connectionstate');
var ReplSetServers = mongo.ReplSet;
var DisconnectedError = require('../../error/disconnected');

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
 * Opens the connection to MongoDB.
 *
 * @param {Function} fn
 * @return {Connection} this
 * @api private
 */

NativeConnection.prototype.doOpen = function(fn) {
  var _this = this;
  var server = new Server(this.host, this.port, this.options.server);

  if (this.options && this.options.mongos) {
    var mongos = new Mongos([server], this.options.mongos);
    this.db = new Db(this.name, mongos, this.options.db);
  } else {
    this.db = new Db(this.name, server, this.options.db);
  }

  this.db.open(function(err) {
    listen(_this);

    if (!mongos) {
      server.s.server.on('error', function(error) {
        if (/after \d+ retries/.test(error.message)) {
          _this.emit('error', new DisconnectedError(server.s.server.name));
        }
      });
    }

    if (err) return fn(err);

    fn();
  });

  return this;
};

/**
 * Switches to a different database using the same connection pool.
 *
 * Returns a new connection object, with the new db.
 *
 * @param {String} name The database name
 * @return {Connection} New Connection Object
 * @api public
 */

NativeConnection.prototype.useDb = function(name) {
  // we have to manually copy all of the attributes...
  var newConn = new this.constructor();
  newConn.name = name;
  newConn.base = this.base;
  newConn.collections = {};
  newConn.models = {};
  newConn.replica = this.replica;
  newConn.hosts = this.hosts;
  newConn.host = this.host;
  newConn.port = this.port;
  newConn.user = this.user;
  newConn.pass = this.pass;
  newConn.options = this.options;
  newConn._readyState = this._readyState;
  newConn._closeCalled = this._closeCalled;
  newConn._hasOpened = this._hasOpened;
  newConn._listening = false;

  // First, when we create another db object, we are not guaranteed to have a
  // db object to work with. So, in the case where we have a db object and it
  // is connected, we can just proceed with setting everything up. However, if
  // we do not have a db or the state is not connected, then we need to wait on
  // the 'open' event of the connection before doing the rest of the setup
  // the 'connected' event is the first time we'll have access to the db object

  var _this = this;

  if (this.db && this._readyState === STATES.connected) {
    wireup();
  } else {
    this.once('connected', wireup);
  }

  function wireup() {
    newConn.db = _this.db.db(name);
    newConn.onOpen();
    // setup the events appropriately
    listen(newConn);
  }

  newConn.name = name;

  // push onto the otherDbs stack, this is used when state changes
  this.otherDbs.push(newConn);
  newConn.otherDbs.push(this);

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

  conn.db.on('close', function() {
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
  conn.db.on('error', function(err) {
    conn.emit('error', err);
  });
  conn.db.on('reconnect', function() {
    conn.readyState = STATES.connected;
    conn.emit('reconnected');
  });
  conn.db.on('timeout', function(err) {
    var error = new Error(err && err.err || 'connection timeout');
    conn.emit('error', error);
  });
  conn.db.on('open', function(err, db) {
    if (STATES.disconnected === conn.readyState && db && db.databaseName) {
      conn.readyState = STATES.connected;
      conn.emit('reconnected');
    }
  });
  conn.db.on('parseError', function(err) {
    conn.emit('parseError', err);
  });
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

NativeConnection.prototype.doOpenSet = function(fn) {
  var servers = [],
      _this = this;

  this.hosts.forEach(function(server) {
    var host = server.host || server.ipc;
    var port = server.port || 27017;
    servers.push(new Server(host, port, _this.options.server));
  });

  var server = this.options.mongos
    ? new Mongos(servers, this.options.mongos)
    : new ReplSetServers(servers, this.options.replset || this.options.replSet);
  this.db = new Db(this.name, server, this.options.db);

  this.db.on('fullsetup', function() {
    _this.emit('fullsetup');
  });

  this.db.on('all', function() {
    _this.emit('all');
  });

  this.db.open(function(err) {
    if (err) return fn(err);
    fn();
    listen(_this);
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

NativeConnection.prototype.doClose = function(fn) {
  this.db.close(fn);
  return this;
};

/**
 * Prepares default connection options for the node-mongodb-native driver.
 *
 * _NOTE: `passed` options take precedence over connection string options._
 *
 * @param {Object} passed options that were passed directly during connection
 * @param {Object} [connStrOptions] options that were passed in the connection string
 * @api private
 */

NativeConnection.prototype.parseOptions = function(passed, connStrOpts) {
  var o = passed || {};
  o.db || (o.db = {});
  o.auth || (o.auth = {});
  o.server || (o.server = {});
  o.replset || (o.replset = o.replSet) || (o.replset = {});
  o.server.socketOptions || (o.server.socketOptions = {});
  o.replset.socketOptions || (o.replset.socketOptions = {});
  o.mongos || (o.mongos = (connStrOpts && connStrOpts.mongos));
  (o.mongos === true) && (o.mongos = {});

  var opts = connStrOpts || {};
  Object.keys(opts).forEach(function(name) {
    switch (name) {
      case 'ssl':
        o.server.ssl = opts.ssl;
        o.replset.ssl = opts.ssl;
        o.mongos && (o.mongos.ssl = opts.ssl);
        break;
      case 'poolSize':
        if (typeof o.server[name] === 'undefined') {
          o.server[name] = o.replset[name] = opts[name];
        }
        break;
      case 'slaveOk':
        if (typeof o.server.slave_ok === 'undefined') {
          o.server.slave_ok = opts[name];
        }
        break;
      case 'autoReconnect':
        if (typeof o.server.auto_reconnect === 'undefined') {
          o.server.auto_reconnect = opts[name];
        }
        break;
      case 'socketTimeoutMS':
      case 'connectTimeoutMS':
        if (typeof o.server.socketOptions[name] === 'undefined') {
          o.server.socketOptions[name] = o.replset.socketOptions[name] = opts[name];
        }
        break;
      case 'authdb':
        if (typeof o.auth.authdb === 'undefined') {
          o.auth.authdb = opts[name];
        }
        break;
      case 'authSource':
        if (typeof o.auth.authSource === 'undefined') {
          o.auth.authSource = opts[name];
        }
        break;
      case 'retries':
      case 'reconnectWait':
      case 'rs_name':
        if (typeof o.replset[name] === 'undefined') {
          o.replset[name] = opts[name];
        }
        break;
      case 'replicaSet':
        if (typeof o.replset.rs_name === 'undefined') {
          o.replset.rs_name = opts[name];
        }
        break;
      case 'readSecondary':
        if (typeof o.replset.read_secondary === 'undefined') {
          o.replset.read_secondary = opts[name];
        }
        break;
      case 'nativeParser':
        if (typeof o.db.native_parser === 'undefined') {
          o.db.native_parser = opts[name];
        }
        break;
      case 'w':
      case 'safe':
      case 'fsync':
      case 'journal':
      case 'wtimeoutMS':
        if (typeof o.db[name] === 'undefined') {
          o.db[name] = opts[name];
        }
        break;
      case 'readPreference':
        if (typeof o.db.readPreference === 'undefined') {
          o.db.readPreference = opts[name];
        }
        break;
      case 'readPreferenceTags':
        if (typeof o.db.read_preference_tags === 'undefined') {
          o.db.read_preference_tags = opts[name];
        }
        break;
      case 'sslValidate':
        o.server.sslValidate = opts.sslValidate;
        o.replset.sslValidate = opts.sslValidate;
        o.mongos && (o.mongos.sslValidate = opts.sslValidate);
    }
  });

  if (!('auto_reconnect' in o.server)) {
    o.server.auto_reconnect = true;
  }

  // mongoose creates its own ObjectIds
  o.db.forceServerObjectId = false;

  // default safe using new nomenclature
  if (!('journal' in o.db || 'j' in o.db ||
        'fsync' in o.db || 'safe' in o.db || 'w' in o.db)) {
    o.db.w = 1;
  }

  if (o.promiseLibrary) {
    o.db.promiseLibrary = o.promiseLibrary;
  }

  validate(o);
  return o;
};

/*!
 * Validates the driver db options.
 *
 * @param {Object} o
 */

function validate(o) {
  if (o.db.w === -1 || o.db.w === 0) {
    if (o.db.journal || o.db.fsync || o.db.safe) {
      throw new Error(
          'Invalid writeConcern: '
        + 'w set to -1 or 0 cannot be combined with safe|fsync|journal');
    }
  }
}

/*!
 * Module exports.
 */

module.exports = NativeConnection;
