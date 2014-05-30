/*!
 * Module dependencies.
 */

var MongooseConnection = require('../../connection')
  , mongo = require('mongodb')
  , Db = mongo.Db
  , Server = mongo.Server
  , Mongos = mongo.Mongos
  , STATES = require('../../connectionstate')
  , ReplSetServers = mongo.ReplSetServers
  , utils = require('../../utils');

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) connection implementation.
 *
 * @inherits Connection
 * @api private
 */

function NativeConnection() {
  MongooseConnection.apply(this, arguments);
  this._listening = false;
};

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

NativeConnection.prototype.doOpen = function (fn) {
  if (this.db) {
    mute(this);
  }

  var server = new Server(this.host, this.port, this.options.server);
  this.db = new Db(this.name, server, this.options.db);

  var self = this;
  this.db.open(function (err) {
    if (err) return fn(err);
    listen(self);
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

NativeConnection.prototype.useDb = function (name) {
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

  var self = this;

  if (this.db && this.db._state == 'connected') {
    wireup();
  } else {
    this.once('connected', wireup);
  }

  function wireup () {
    newConn.db = self.db.db(name);
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
  conn.db.on('reconnect', function() {
    conn.readyState = STATES.connected;
    conn.emit('reconnected');
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

/*!
 * Remove listeners registered in `listen`
 */

function mute (conn) {
  if (!conn.db) throw new Error('missing db');
  conn.db.removeAllListeners("close");
  conn.db.removeAllListeners("error");
  conn.db.removeAllListeners("timeout");
  conn.db.removeAllListeners("open");
  conn.db.removeAllListeners("fullsetup");
  conn._listening = false;
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
  if (this.db) {
    mute(this);
  }

  var servers = []
    , self = this;

  this.hosts.forEach(function (server) {
    var host = server.host || server.ipc;
    var port = server.port || 27017;
    servers.push(new Server(host, port, self.options.server));
  })

  var server = this.options.mongos
    ? new Mongos(servers, this.options.mongos)
    : new ReplSetServers(servers, this.options.replset);
  this.db = new Db(this.name, server, this.options.db);

  this.db.on('fullsetup', function () {
    self.emit('fullsetup')
  });

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

/**
 * Prepares default connection options for the node-mongodb-native driver.
 *
 * _NOTE: `passed` options take precedence over connection string options._
 *
 * @param {Object} passed options that were passed directly during connection
 * @param {Object} [connStrOptions] options that were passed in the connection string
 * @api private
 */

NativeConnection.prototype.parseOptions = function (passed, connStrOpts) {
  var o = passed || {};
  o.db || (o.db = {});
  o.auth || (o.auth = {});
  o.server || (o.server = {});
  o.replset || (o.replset = {});
  o.server.socketOptions || (o.server.socketOptions = {});
  o.replset.socketOptions || (o.replset.socketOptions = {});

  var opts = connStrOpts || {};
  Object.keys(opts).forEach(function (name) {
    switch (name) {
      case 'ssl':
      case 'poolSize':
        if ('undefined' == typeof o.server[name]) {
          o.server[name] = o.replset[name] = opts[name];
        }
        break;
      case 'slaveOk':
        if ('undefined' == typeof o.server.slave_ok) {
          o.server.slave_ok = opts[name];
        }
        break;
      case 'autoReconnect':
        if ('undefined' == typeof o.server.auto_reconnect) {
          o.server.auto_reconnect = opts[name];
        }
        break;
      case 'socketTimeoutMS':
      case 'connectTimeoutMS':
        if ('undefined' == typeof o.server.socketOptions[name]) {
          o.server.socketOptions[name] = o.replset.socketOptions[name] = opts[name];
        }
        break;
      case 'authdb':
        if ('undefined' == typeof o.auth.authdb) {
          o.auth.authdb = opts[name];
        }
        break;
      case 'authSource':
        if ('undefined' == typeof o.auth.authSource) {
          o.auth.authSource = opts[name];
        }
        break;
      case 'retries':
      case 'reconnectWait':
      case 'rs_name':
        if ('undefined' == typeof o.replset[name]) {
          o.replset[name] = opts[name];
        }
        break;
      case 'replicaSet':
        if ('undefined' == typeof o.replset.rs_name) {
          o.replset.rs_name = opts[name];
        }
        break;
      case 'readSecondary':
        if ('undefined' == typeof o.replset.read_secondary) {
          o.replset.read_secondary = opts[name];
        }
        break;
      case 'nativeParser':
        if ('undefined' == typeof o.db.native_parser) {
          o.db.native_parser = opts[name];
        }
        break;
      case 'w':
      case 'safe':
      case 'fsync':
      case 'journal':
      case 'wtimeoutMS':
        if ('undefined' == typeof o.db[name]) {
          o.db[name] = opts[name];
        }
        break;
      case 'readPreference':
        if ('undefined' == typeof o.db.read_preference) {
          o.db.read_preference = opts[name];
        }
        break;
      case 'readPreferenceTags':
        if ('undefined' == typeof o.db.read_preference_tags) {
          o.db.read_preference_tags = opts[name];
        }
        break;
    }
  })

  if (!('auto_reconnect' in o.server)) {
    o.server.auto_reconnect = true;
  }

  if (!o.db.read_preference) {
    // read from primaries by default
    o.db.read_preference = 'primary';
  }

  // mongoose creates its own ObjectIds
  o.db.forceServerObjectId = false;

  // default safe using new nomenclature
  if (!('journal' in o.db || 'j' in o.db ||
        'fsync' in o.db || 'safe' in o.db || 'w' in o.db)) {
    o.db.w = 1;
  }

  validate(o);
  return o;
}

/*!
 * Validates the driver db options.
 *
 * @param {Object} o
 */

function validate (o) {
  if (-1 === o.db.w || 0 === o.db.w) {
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
