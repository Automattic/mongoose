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
    server = new mongo.Server(this.host, this.port, this.options.server);
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
  var servers = []
    , self = this;

  if (!this.db) {
    this.hosts.forEach(function (server) {
      var host = server.host || server.ipc;
      var port = server.port || 27017;
      servers.push(new mongo.Server(host, port, self.options.server));
    })

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
  o.server || (o.server = {});
  o.replset || (o.replset = {});
  o.server.socketOptions || (o.server.socketOptions = {});
  o.replset.socketOptions || (o.replset.socketOptions = {});

  var opts = connStrOpts || {};
  Object.keys(opts).forEach(function (name) {
    switch (name) {
      case 'poolSize':
        if ('undefined' == typeof o.server.poolSize) {
          o.server.poolSize = o.replset.poolSize = opts[name];
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
      case 'ssl':
      case 'socketTimeoutMS':
      case 'connectTimeoutMS':
        if ('undefined' == typeof o.server.socketOptions[name]) {
          o.server.socketOptions[name] = o.replset.socketOptions[name] = opts[name];
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
