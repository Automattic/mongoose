/*!
 * Module dependencies.
 */

var url = require('url')
  , utils = require('./utils')
  , EventEmitter = utils.EventEmitter
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
  , Model = require('./model')
  , Schema = require('./schema')
  , Collection  = require(driver + '/collection')
  , STATES = require('./connectionstate')
  , assert =require('assert')

/*!
 * Protocol prefix regexp.
 *
 * @api private
 */

var rgxProtocol = /^(?:.)+:\/\//;

/**
 * Connection constructor
 *
 * For practical reasons, a Connection equals a Db.
 *
 * @param {Mongoose} base a mongoose instance
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `connecting`: Emitted when `connection.{open,openSet}()` is executed on this connection.
 * @event `connected`: Emitted when this connection successfully connects to the db. May be emitted _multiple_ times in `reconnected` scenarios.
 * @event `open`: Emitted after we `connected` and `onOpen` is executed on all of this connections models.
 * @event `disconnecting`: Emitted when `connection.close()` was executed.
 * @event `disconnected`: Emitted after getting disconnected from the db.
 * @event `close`: Emitted after we `disconnected` and `onClose` executed on all of this connections models.
 * @event `reconnected`: Emitted after we `connected` and subsequently `disconnected`, followed by successfully another successfull connection.
 * @event `error`: Emitted when an error occurs on this connection.
 * @event `fullsetup`: Emitted in a replica-set scenario, when all nodes specified in the connection string are connected.
 * @api public
 */

function Connection (base) {
  this.base = base;
  this.collections = {};
  this.models = {};
  this.replica = false;
  this.host = null;
  this.port = null;
  this.user = null;
  this.pass = null;
  this.name = null;
  this.options = null;
  this._readyState = STATES.disconnected;
  this._closeCalled = false;
  this._hasOpened = false;
};

/*!
 * Inherit from EventEmitter
 */

Connection.prototype.__proto__ = EventEmitter.prototype;

/**
 * Connection ready state
 *
 * - 0 = disconnected
 * - 1 = connected
 * - 2 = connecting
 * - 3 = disconnecting
 *
 * Each state change emits its associated event name.
 *
 * ####Example
 *
 *     conn.on('connected', callback);
 *     conn.on('disconnected', callback);
 *
 * @property readyState
 * @api public
 */

Object.defineProperty(Connection.prototype, 'readyState', {
    get: function(){ return this._readyState; }
  , set: function (val) {
      if (!(val in STATES)) {
        throw new Error('Invalid connection state: ' + val);
      }

      if (this._readyState !== val) {
        this._readyState = val;

        if (STATES.connected === val)
          this._hasOpened = true;

        this.emit(STATES[val]);
      }
    }
});

/**
 * A hash of the collections associated with this connection
 *
 * @property collections
 */

Connection.prototype.collections;

/**
 * The mongodb.Db instance, set when the connection is opened
 *
 * @property db
 */

Connection.prototype.db;

/**
 * Opens the connection to MongoDB.
 *
 * `options` is a hash with the following possible properties:
 *
 *     db      - passed to the connection db instance
 *     server  - passed to the connection server instance(s)
 *     replset - passed to the connection ReplSetServer instance
 *     user    - username for authentication
 *     pass    - password for authentication
 *
 * ####Notes:
 *
 * Mongoose forces the db option `forceServerObjectId` false and cannot be overridden.
 * Mongoose defaults the server `auto_reconnect` options to true which can be overridden.
 * See the node-mongodb-native driver instance for options that it understands.
 *
 * @param {String} connection_string mongodb://uri or the host to which you are connecting
 * @param {String} [database] database name
 * @param {Number} [port] database port
 * @param {Object} [options] options
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
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

    if (!rgxProtocol.test(host)) {
      host = 'mongodb://' + host;
    }

    uri = url.parse(host);
    host = uri.hostname;
    port = uri.port || 27017;
    database = uri.pathname && uri.pathname.replace(/\//g, '');
  }

  this.options = this.defaultOptions(options);

  // make sure we can open
  if (STATES.disconnected !== this.readyState) {
    var err = new Error('Trying to open unclosed connection.');
    err.state = this.readyState;
    this.error(err, callback);
    return this;
  }

  if (!host) {
    this.error(new Error('Missing connection hostname.'), callback);
    return this;
  }

  if (!database) {
    this.error(new Error('Missing connection database.'), callback);
    return this;
  }

  // handle authentication
  if (uri && uri.auth) {
    var auth = uri.auth.split(':');
    this.user = auth[0];
    this.pass = auth[1];

  // Check hostname for user/pass
  } else if (/@/.test(host) && /:/.test(host.split('@')[0])) {
    host = host.split('@');
    var auth = host.shift().split(':');
    host = host.pop();
    this.user = auth[0];
    this.pass = auth[1];

  // user/pass options
  } else if (options && options.user && options.pass) {
    this.user = options.user;
    this.pass = options.pass;

  } else {
    this.user = this.pass = undefined;
  }

  this.name = database;
  this.host = host;
  this.port = port;

  this._open(callback);
  return this;
};

/**
 * Connects to a replica set.
 *
 * ####Example:
 *
 *     var db = mongoose.createConnection();
 *     db.openSet("mongodb://user:pwd@localhost:27020/testing,mongodb://example.com:27020,mongodb://localhost:27019");
 *
 * The database name and/or auth need only be included in one URI.
 * The `options` is a hash which is passed to the internal driver connection object.
 *
 * Valid `options`
 *
 *     db      - passed to the connection db instance
 *     server  - passed to the connection server instance(s)
 *     replset - passed to the connection ReplSetServer instance
 *     user    - username for authentication
 *     pass    - password for authentication
 *
 * @param {String} uris comma-separated mongodb:// `URI`s
 * @param {String} [database] database name if not included in `uris`
 * @param {Object} [options] passed to the internal driver
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
 * @api public
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

  if (uris.length < 2) {
    this.error(new Error('Please provide comma-separated URIs'), callback);
    return this;
  }

  this.replica = true;
  this.host = [];
  this.port = [];

  uris.forEach(function (uri) {
    // handle missing protocols
    if (!rgxProtocol.test(uri))
      uri = 'mongodb://' + uri;

    var uri = url.parse(uri);

    self.host.push(uri.hostname);
    self.port.push(uri.port || 27017);

    if (!self.name && uri.pathname && uri.pathname.replace(/\//g, ''))
      self.name = uri.pathname.replace(/\//g, '');

    if (!self.user && uri.auth) {
      var auth = uri.auth.split(':');
      self.user = auth[0];
      self.pass = auth[1];
    }
  });

  if (!this.name) {
    this.error(new Error('No database name provided for replica set'), callback);
    return this;
  }

  this._open(callback);
  return this;
};

/**
 * error
 *
 * Graceful error handling, passes error to callback
 * if available, else emits error on the connection.
 *
 * @param {Error} err
 * @param {Function} callback optional
 * @api private
 */

Connection.prototype.error = function (err, callback) {
  if (callback) return callback(err);
  this.emit('error', err);
}

/**
 * Handles opening the connection with the appropriate method based on connection type.
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._open = function (callback) {
  this.readyState = STATES.connecting;
  this._closeCalled = false;

  var self = this;

  var method = this.replica
    ? 'doOpenSet'
    : 'doOpen';

  // open connection
  this[method](function (err) {
    if (err) {
      self.readyState = STATES.disconnected;
      if (self._hasOpened) {
        if (callback) callback(err);
      } else {
        self.error(err, callback);
      }
      return;
    }

    self.onOpen();
    callback && callback();
  });
}

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function () {
  var self = this;

  function open () {
    self.readyState = STATES.connected;

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
 * @param {Function} [callback] optional
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function (callback) {
  var self = this;
  this._closeCalled = true;

  switch (this.readyState){
    case 0: // disconnected
      callback && callback();
      break;

    case 1: // connected
      this.readyState = STATES.disconnecting;
      this.doClose(function(err){
        if (err){
          self.error(err, callback);
        } else {
          self.onClose();
          callback && callback();
        }
      });
      break;

    case 2: // connecting
      this.once('open', function(){
        self.close(callback);
      });
      break;

    case 3: // disconnecting
      if (!callback) break;
      this.once('close', function () {
        callback();
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
  this.readyState = STATES.disconnected;

  // avoid having the collection subscribe to our event emitter
  // to prevent 0.3 warning
  for (var i in this.collections)
    this.collections[i].onClose();

  this.emit('close');
};

/**
 * Retrieves a collection, creating it if not cached.
 *
 * @param {String} name of the collection
 * @param {Object} [options] optional collection options
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function (name, options) {
  if (!(name in this.collections))
    this.collections[name] = new Collection(name, this, options);
  return this.collections[name];
};

/**
 * Defines or retrieves a model.
 *
 *     var mongoose = require('mongoose');
 *     var db = mongoose.createConnection(..);
 *     db.model('Venue', new Schema(..));
 *     var Ticket = db.model('Ticket', new Schema(..));
 *     var Venue = db.model('Venue');
 *
 * @param {String} name the model name
 * @param {Schema} [schema] a schema. necessary when defining a model
 * @param {String} [collection] name of mongodb collection (optional) if not given it will be induced from model name
 * @see Mongoose#model #index_Mongoose-model
 * @return {Model} The compiled model
 * @api public
 */

Connection.prototype.model = function (name, schema, collection) {
  if (!this.models[name]) {
    var model = this.base.model(name, schema, collection, true)
      , Model

    if (this != model.prototype.db) {
      // subclass model using this connection and collection name
      Model = function Model (doc, fields, skipId) {
        if (!(this instanceof Model))
          return new Model(doc, fields, skipId);
        model.call(this, doc, fields, skipId);
      };

      Model.__proto__ = model;
      Model.prototype.__proto__ = model.prototype;
      Model.db = Model.prototype.db = this;

      // collection name discovery
      if ('string' === typeof schema) {
        collection = schema;
      }

      if (!collection) {
        collection = model.prototype.schema.set('collection') || utils.toCollectionName(name);
      }

      var s = 'string' != typeof schema
        ? schema
        : model.prototype.schema;

      Model.prototype.collection = this.collection(collection, s && s.options.capped);
      Model.collection = Model.prototype.collection;
      Model.init();
    }

    this.models[name] = Model || model;
  }

  return this.models[name];
};

/**
 * Set profiling level.
 *
 * @param {Number|String} level either off (0), slow (1), or all (2)
 * @param {Number} [ms] the threshold in milliseconds above which queries will be logged when in `slow` mode. defaults to 100.
 * @param {Function} callback
 * @api public
 */

Connection.prototype.setProfiling = function (level, ms, callback) {
  if (STATES.connected !== this.readyState) {
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

/*!
 * Noop.
 */

function noop () {}

/*!
 * Module exports.
 */

Connection.STATES = STATES;
module.exports = Connection;
