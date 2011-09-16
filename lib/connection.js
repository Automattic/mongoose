/**
 * Module dependencies.
 */

var url = require('url')
  , utils = require('./utils')
  , EventEmitter = utils.EventEmitter
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
  , Model = require('./model')
  , Schema = require('./schema')
  , Collection  = require(driver + '/collection');

/**
 * Connection constructor. For practical reasons, a Connection equals a Db
 *
 * @param {Mongoose} mongoose base
 * @api public
 */

function Connection (base) {
  this.base = base;
  this.collections = {};
  this.models = {};
};

/**
 * Inherit from EventEmitter.
 *
 */

Connection.prototype.__proto__ = EventEmitter.prototype;

/**
 * Connection ready state:
 *  0 = Disconnected
 *  1 = Connected
 *  2 = Connecting
 *  3 = Disconnecting
 *
 * @api public
 */

Connection.prototype.readyState = 0;

/**
 * A hash of the collections associated with this connection
 */

Connection.prototype.collections;

/**
 * The mongodb.Db instance, set when the connection is opened
 *
 * @api public
 */

Connection.prototype.db;

/**
 * Establishes the connection
 *
 *  `options` is a hash with the following optional properties:
 *
 *   options.db      - passed to the connection db instance
 *   options.server  - passed to the connection server instance(s)
 *   options.replset - passed to the connection ReplSetServer instance
 *
 *   Notes:
 *
 *   Mongoose forces the db option `forceServerObjectId` false and cannot
 *   be overridden.
 *
 *   Mongoose defaults the server `auto_reconnect` options to true which
 *   can be overridden.
 *
 *   See the node-mongodb-native driver instance for options that it
 *   understands.
 *
 * @param {String} mongodb://uri
 * @return {Connection} self
 * @see https://github.com/christkv/node-mongodb-native
 * @api public
 */

Connection.prototype.open = function (host, database, port, options, callback) {
  var self = this
    , uri;

  if ('string' === typeof database) {
    switch (arguments.length) {
      case 2:
        port = 27017;
      case 3:
        switch (typeof port) {
          case 'function':
            callback = port, port = 27017;
            break;
          case 'object':
            options = port, port = 27017;
            break;
        }
        break;
      case 4:
        if ('function' === typeof options)
          callback = options, options = {};
    }
  } else {
    switch (typeof database) {
      case 'function':
        callback = database, database = undefined;
        break;
      case 'object':
        options = database;
        database = undefined;
        callback = port;
        break;
    }

    uri = url.parse(host);
    host = uri.hostname;
    port = uri.port || 27017;
    database = uri.pathname && uri.pathname.replace(/\//g, '');
  }

  callback = callback || noop;
  this.options = this.defaultOptions(options);

  // make sure we can open
  if (0 !== this.readyState) {
    var err = new Error('Trying to open unclosed connection.');
    err.state = this.readyState;
    callback(err);
    return this;
  }

  if (!host) {
    callback(new Error('Missing connection hostname.'));
    return this;
  }

  if (!database) {
    callback(new Error('Missing connection database.'));
    return this;
  }

  // handle authentication
  if (uri && uri.auth) {
    var auth = uri.auth.split(':');
    this.user = auth[0];
    this.pass = auth[1];
  } else {
    this.user = this.pass = undefined;
  }

  this.name = database;
  this.host = host;
  this.port = port;

  // signal connecting
  this.readyState = 2;
  this.emit('opening');

  // open connection
  this.doOpen(function (err) {
    if (err) {
      if (self._events && self._events.error && self._events.error.length) {
        self.emit("error", err);
      }
      self.readyState = 0;
    } else {
      self.onOpen();
    }

    callback(err || null);
  });

  return this;
};

/**
 * Connects to a replica set.
 *
 * Supply a comma-separted list of mongodb:// URIs. You only need to specify
 * the database name and/or auth to one of them.
 *
 * The options parameter is passed to the low level connection. See the
 * node-mongodb-native driver instance for detail.
 *
 * @param {String} comma-separated mongodb:// URIs
 * @param {String} optional database name
 * @param {Object} optional options
 * @param {Function} optional callback
 */

Connection.prototype.openSet = function (uris, database, options, callback) {
  var uris = uris.split(',')
    , self = this;

  switch (arguments.length) {
    case 3:
      this.name = database;
      if ('function' === typeof options) callback = options, options = {};
      break;
    case 2:
      switch (typeof database) {
        case 'string':
          this.name = database;
        case 'function':
          callback = database, database = null;
          break;
        case 'object':
          options = database, database = null;
          break;
      }
  }

  this.options = options = this.defaultOptions(options);
  callback = callback || noop;

  if (uris.length < 2) {
    callback(new Error('Please provide comma-separated URIs'));
    return this;
  }

  this.host = [];
  this.port = [];

  uris.forEach(function (uri) {
    var uri = url.parse(uri);

    self.host.push(uri.hostname);
    self.port.push(uri.port || 27017);

    if (!self.name && uri.pathname.replace(/\//g, ''))
      self.name = uri.pathname.replace(/\//g, '');

    if (!self.user && uri.auth) {
      var auth = uri.auth.split(':');
      self.user = auth[0];
      self.pass = auth[1];
    }
  });

  if (!this.name) {
    callback(new Error('No database name provided for replica set'));
    return this;
  }

  this.readyState = 2;
  this.emit('opening');

  // open connection
  this.doOpenSet(function (err) {
    if (err) {
      if (self._events && self._events.error && self._events.error.length) {
        self.emit("error", err);
      }
      self.readyState = 0;
    } else {
      self.onOpen();
    }

    callback(err || null);
  });
};

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function () {
  var self = this;

  function open () {
    self.readyState = 1;

    // avoid having the collection subscribe to our event emitter
    // to prevent 0.3 warning
    for (var i in self.collections)
      self.collections[i].onOpen();

    self.emit('open');
  };

  // re-authenticate
  if (self.user && self.pass)
    self.db.authenticate(self.user, self.pass, open);
  else
    open();
};

/**
 * Closes the connection
 *
 * @param {Function} optional callback
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function (callback) {
  var self = this
    , callback = callback || function(){};

  switch (this.readyState){
    case 0: // disconnected
      callback(null);
      break;

    case 1: // connected
      this.readyState = 3;
      this.doClose(function(err){
        if (err){
          callback(err);
        } else {
          self.onClose();
          callback(null);
        }
      });
      break;

    case 2: // connecting
      this.once('open', function(){
        self.close(callback);
      });
      break;

    case 3: // disconnecting
      this.once('close', function () {
        callback(null);
      });
      break;
  }

  return this;
};

/**
 * Called when the connection closes
 *
 * @api private
 */

Connection.prototype.onClose = function () {
  this.readyState = 0;

  // avoid having the collection subscribe to our event emitter
  // to prevent 0.3 warning
  for (var i in this.collections)
    this.collections[i].onClose();

  this.emit('close');
};

/**
 * Retrieves a collection, creating it if not cached.
 *
 * @param {String} collection name
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function (name) {
  if (!(name in this.collections))
    this.collections[name] = new Collection(name, this);
  return this.collections[name];
};

/**
 * Defines a model or retrieves it
 *
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name (optional, induced from model name)
 * @api public
 */

Connection.prototype.model = function (name, schema, collection) {
  if (!this.models[name]) {
    var model = this.base.model(name, schema, collection, true)
      , Model

    if (this != model.prototype.connection) {
      // subclass model using this connection and collection name
      Model = function Model () {
        model.apply(this, arguments);
      };

      Model.__proto__ = model;
      Model.prototype.__proto__ = model.prototype;
      Model.prototype.db = this;

      // collection name discovery
      if ('string' === typeof schema) {
        collection = schema;
      }

      if (!collection) {
        collection = model.prototype.schema.set('collection') || utils.toCollectionName(name);
      }

      Model.prototype.collection = this.collection(collection);
      Model.init();
    }

    this.models[name] = Model || model;
  }

  return this.models[name];
};

/**
 * Set profiling level.
 *
 * @param {Int|String} level - Either off (0), slow (1), or all (2)
 * @param {Int} [ms]  If profiling `level` is set to 1, this determines
 *                    the threshold in milliseconds above which queries
 *                    will be logged. Defaults to 100. (optional)
 * @param {Function} callback
 * @api public
 */

Connection.prototype.setProfiling = function (level, ms, callback) {
  if (1 !== this.readyState) {
    return this.on('open', this.setProfiling.bind(this, level, ms, callback));
  }

  if (!callback) callback = ms, ms = 100;

  var cmd = {};

  switch (level) {
    case 0:
    case 'off':
      cmd.profile = 0;
      break;
    case 1:
    case 'slow':
      cmd.profile = 1;
      if ('number' !== typeof ms) {
        ms = parseInt(ms, 10);
        if (isNaN(ms)) ms = 100;
      }
      cmd.slowms = ms;
      break;
    case 2:
    case 'all':
      cmd.profile = 2;
      break;
    default:
      return callback(new Error('Invalid profiling level: '+ level));
  }

  this.db.executeDbCommand(cmd, function (err, resp) {
    if (err) return callback(err);

    var doc = resp.documents[0];

    err = 1 === doc.ok
      ? null
      : new Error('Could not set profiling level to: '+ level)

    callback(err, doc);
  });
};

/**
 * Prepares default connection options.
 *
 * @param {Object} options
 * @api private
 */

Connection.prototype.defaultOptions = function (options) {
  var o = options || {};

  o.server = o.server || {};

  if (!('auto_reconnect' in o.server)) {
    o.server.auto_reconnect = true;
  }

  o.db = o.db || {};
  o.db.forceServerObjectId = false;

  return o;
}

/**
 * Noop.
 */

function noop () {}

/**
 * Module exports.
 */

module.exports = Connection;
