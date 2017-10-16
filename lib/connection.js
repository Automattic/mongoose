/*!
 * Module dependencies.
 */

var utils = require('./utils');
var EventEmitter = require('events').EventEmitter;
var driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';
var Schema = require('./schema');
var Collection = require(driver + '/collection');
var STATES = require('./connectionstate');
var MongooseError = require('./error');
var muri = require('muri');
var PromiseProvider = require('./promise_provider');
var mongodb = require('mongodb');
var util = require('util');

/*!
 * Protocol prefix regexp.
 *
 * @api private
 */

var rgxProtocol = /^(?:.)+:\/\//;

/*!
 * A list of authentication mechanisms that don't require a password for authentication.
 * This is used by the authMechanismDoesNotRequirePassword method.
 *
 * @api private
 */
var authMechanismsWhichDontRequirePassword = [
  'MONGODB-X509'
];

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
 * @event `fullsetup`: Emitted in a replica-set scenario, when primary and at least one seconaries specified in the connection string are connected.
 * @event `all`: Emitted in a replica-set scenario, when all nodes specified in the connection string are connected.
 * @api public
 */

function Connection(base) {
  this.base = base;
  this.collections = {};
  this.models = {};
  this.config = {autoIndex: true};
  this.replica = false;
  this.hosts = null;
  this.host = null;
  this.port = null;
  this.user = null;
  this.pass = null;
  this.name = null;
  this.options = null;
  this.otherDbs = [];
  this.states = STATES;
  this._readyState = STATES.disconnected;
  this._closeCalled = false;
  this._hasOpened = false;
}

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
  get: function() {
    return this._readyState;
  },
  set: function(val) {
    if (!(val in STATES)) {
      throw new Error('Invalid connection state: ' + val);
    }

    if (this._readyState !== val) {
      this._readyState = val;
      // loop over the otherDbs on this connection and change their state
      for (var i = 0; i < this.otherDbs.length; i++) {
        this.otherDbs[i].readyState = val;
      }

      if (STATES.connected === val) {
        this._hasOpened = true;
      }

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
 * A hash of the global options that are associated with this connection
 *
 * @property config
 */

Connection.prototype.config;

/*!
 * ignore
 */

Connection.prototype._handleOpenArgs = function(host, database, port, options, callback) {
  var err;

  var parsed;

  if (typeof database === 'string') {
    switch (arguments.length) {
      case 2:
        port = 27017;
        break;
      case 3:
        switch (typeof port) {
          case 'function':
            callback = port;
            port = 27017;
            break;
          case 'object':
            options = port;
            port = 27017;
            break;
        }
        break;
      case 4:
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
    }
  } else {
    switch (typeof database) {
      case 'function':
        callback = database;
        database = undefined;
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

    try {
      parsed = muri(host);
    } catch (error) {
      this.error(error, callback);
      throw error;
    }

    database = parsed.db;
    host = parsed.hosts[0].host || parsed.hosts[0].ipc;
    port = parsed.hosts[0].port || 27017;
  }

  this.options = this.parseOptions(options, parsed && parsed.options);

  // make sure we can open
  if (STATES.disconnected !== this.readyState) {
    err = new Error('Trying to open unclosed connection.');
    err.state = this.readyState;
    this.error(err, callback);
    throw err;
  }

  if (!host) {
    err = new Error('Missing hostname.');
    this.error(err, callback);
    throw err;
  }

  if (!database) {
    err = new Error('Missing database name.');
    this.error(err, callback);
    throw err;
  }

  // authentication
  if (this.optionsProvideAuthenticationData(options)) {
    this.user = options.user;
    this.pass = options.pass;
  } else if (parsed && parsed.auth) {
    this.user = parsed.auth.user;
    this.pass = parsed.auth.pass;

    // Check hostname for user/pass
  } else if (/@/.test(host) && /:/.test(host.split('@')[0])) {
    host = host.split('@');
    if (host.length > 2) {
      err = new Error('Username and password must be URI encoded if they ' +
        'contain "@", see http://bit.ly/2nRYRyq');
      throw err;
    }
    var auth = host.shift().split(':');
    if (auth.length > 2) {
      err = new Error('Username and password must be URI encoded if they ' +
        'contain ":", see http://bit.ly/2nRYRyq');
      throw err;
    }
    host = host.pop();
    this.user = auth[0];
    this.pass = auth[1];
  } else {
    this.user = this.pass = undefined;
  }

  // global configuration options
  if (options && options.config) {
    this.config.autoIndex = options.config.autoIndex !== false;
  }

  this.name = database;
  this.host = host;
  this.port = port;

  return callback;
};

/**
 * Opens the connection to MongoDB.
 *
 * `options` is a hash with the following possible properties:
 *
 *     config  - passed to the connection config instance
 *     db      - passed to the connection db instance
 *     server  - passed to the connection server instance(s)
 *     replset - passed to the connection ReplSet instance
 *     user    - username for authentication
 *     pass    - password for authentication
 *     auth    - options for authentication (see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate)
 *
 * ####Notes:
 *
 * Mongoose forces the db option `forceServerObjectId` false and cannot be overridden.
 * Mongoose defaults the server `auto_reconnect` options to true which can be overridden.
 * See the node-mongodb-native driver instance for options that it understands.
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * @param {String} connection_string mongodb://uri or the host to which you are connecting
 * @param {String} [database] database name
 * @param {Number} [port] database port
 * @param {Object} [options] options
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
 * @see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
 * @api public
 */

Connection.prototype.open = util.deprecate(function() {
  var Promise = PromiseProvider.get();
  var callback;

  try {
    callback = this._handleOpenArgs.apply(this, arguments);
  } catch (error) {
    return new Promise.ES6(function(resolve, reject) {
      reject(error);
    });
  }

  var _this = this;
  var promise = new Promise.ES6(function(resolve, reject) {
    _this._open(true, function(error) {
      callback && callback(error);
      if (error) {
        // Error can be on same tick re: christkv/mongodb-core#157
        setImmediate(function() {
          reject(error);
          if (!callback && !promise.$hasHandler) {
            _this.emit('error', error);
          }
        });
        return;
      }
      resolve();
    });
  });

  // Monkey-patch `.then()` so if the promise is handled, we don't emit an
  // `error` event.
  var _then = promise.then;
  promise.then = function(resolve, reject) {
    promise.$hasHandler = true;
    return _then.call(promise, resolve, reject);
  };

  return promise;
}, '`open()` is deprecated in mongoose >= 4.11.0, use `openUri()` instead, or set the `useMongoClient` option if using `connect()` or `createConnection()`. See http://mongoosejs.com/docs/connections.html#use-mongo-client');

/*!
 * ignore
 */

Connection.prototype._openWithoutPromise = function() {
  var callback;

  try {
    callback = this._handleOpenArgs.apply(this, arguments);
  } catch (error) {
    // No need to do anything
  }

  var _this = this;
  this._open(true, function(error) {
    callback && callback(error);
    if (error && !callback) {
      // Error can be on same tick re: christkv/mongodb-core#157
      setImmediate(function() {
        _this.emit('error', error);
      });
      return;
    }
  });
};

/**
 * Helper for `dropCollection()`. Will delete the given collection, including
 * all documents and indexes.
 *
 * @param {string} collection The collection to delete
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Connection.prototype.dropCollection = _wrapConnHelper(function dropCollection(collection, cb) {
  this.db.dropCollection(collection, cb);
});

/**
 * Helper for `dropDatabase()`. Deletes the given database, including all
 * collections, documents, and indexes.
 *
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Connection.prototype.dropDatabase = _wrapConnHelper(function dropDatabase(cb) {
  this.db.dropDatabase(cb);
});

/*!
 * ignore
 */

function _wrapConnHelper(fn) {
  return function() {
    var _this = this;
    var Promise = PromiseProvider.get();
    var argsWithoutCb = Array.prototype.slice.call(arguments, 0, fn.length - 1);
    var cb = arguments[arguments.length - 1];
    var promise = new Promise.ES6(function(resolve, reject) {
      if (_this.readyState !== STATES.connected) {
        _this.on('open', function() {
          fn.apply(_this, argsWithoutCb.concat([function(error) {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }]));
        });
      } else {
        fn.apply(_this, argsWithoutCb.concat([function(error) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }]));
      }
    });
    if (cb) {
      promise.
        then(function() { cb(); }, function(error) { cb(error); });
    }
    return promise;
  };
}

/*!
 * ignore
 */

Connection.prototype._handleOpenSetArgs = function(uris, database, options, callback) {
  if (!rgxProtocol.test(uris)) {
    uris = 'mongodb://' + uris;
  }

  switch (arguments.length) {
    case 3:
      switch (typeof database) {
        case 'string':
          this.name = database;
          break;
        case 'object':
          callback = options;
          options = database;
          database = null;
          break;
      }

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      break;
    case 2:
      switch (typeof database) {
        case 'string':
          this.name = database;
          break;
        case 'function':
          callback = database;
          database = null;
          break;
        case 'object':
          options = database;
          database = null;
          break;
      }
  }

  if (typeof database === 'string') {
    this.name = database;
  }

  var parsed;
  try {
    parsed = muri(uris);
  } catch (err) {
    this.error(err, callback);
    throw err;
  }

  if (!this.name) {
    this.name = parsed.db;
  }

  this.hosts = parsed.hosts;
  this.options = this.parseOptions(options, parsed && parsed.options);
  this.replica = true;

  if (!this.name) {
    var err = new Error('No database name provided for replica set');
    this.error(err, callback);
    throw err;
  }

  // authentication
  if (this.optionsProvideAuthenticationData(options)) {
    this.user = options.user;
    this.pass = options.pass;
  } else if (parsed && parsed.auth) {
    this.user = parsed.auth.user;
    this.pass = parsed.auth.pass;
  } else {
    this.user = this.pass = undefined;
  }

  // global configuration options
  if (options && options.config) {
    this.config.autoIndex = options.config.autoIndex !== false;
  }

  return callback;
};

/*!
 * ignore
 */

Connection.prototype._openSetWithoutPromise = function(uris, database, options, callback) {
  try {
    callback = this._handleOpenSetArgs.apply(this, arguments);
  } catch (err) {
    // Nothing to do, `_handleOpenSetArgs` calls callback if error occurred
    return;
  }

  var _this = this;
  var emitted = false;
  this._open(true, function(error) {
    callback && callback(error);
    if (error) {
      if (!callback && !emitted) {
        emitted = true;
        _this.emit('error', error);
      }
      return;
    }
  });
};

/**
 * Opens the connection to a replica set.
 *
 * ####Example:
 *
 *     var db = mongoose.createConnection();
 *     db.openSet("mongodb://user:pwd@localhost:27020,localhost:27021,localhost:27012/mydb");
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
 *     auth    - options for authentication (see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate)
 *     mongos  - Boolean - if true, enables High Availability support for mongos
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * ####Notes:
 *
 * _If connecting to multiple mongos servers, set the `mongos` option to true._
 *
 *     conn.open('mongodb://mongosA:27501,mongosB:27501', { mongos: true }, cb);
 *
 * Mongoose forces the db option `forceServerObjectId` false and cannot be overridden.
 * Mongoose defaults the server `auto_reconnect` options to true which can be overridden.
 * See the node-mongodb-native driver instance for options that it understands.
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * @param {String} uris MongoDB connection string
 * @param {String} [database] database name if not included in `uris`
 * @param {Object} [options] passed to the internal driver
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
 * @see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
 * @api public
 */

Connection.prototype.openSet = util.deprecate(function(uris, database, options, callback) {
  var Promise = PromiseProvider.get();

  try {
    callback = this._handleOpenSetArgs.apply(this, arguments);
  } catch (err) {
    return new Promise.ES6(function(resolve, reject) {
      reject(err);
    });
  }

  var _this = this;
  var emitted = false;
  var promise = new Promise.ES6(function(resolve, reject) {
    _this._open(true, function(error) {
      callback && callback(error);
      if (error) {
        reject(error);
        if (!callback && !promise.$hasHandler && !emitted) {
          emitted = true;
          _this.emit('error', error);
        }
        return;
      }
      resolve();
    });
  });

  // Monkey-patch `.then()` so if the promise is handled, we don't emit an
  // `error` event.
  var _then = promise.then;
  promise.then = function(resolve, reject) {
    promise.$hasHandler = true;
    return _then.call(promise, resolve, reject);
  };

  return promise;
}, '`openSet()` is deprecated in mongoose >= 4.11.0, use `openUri()` instead, or set the `useMongoClient` option if using `connect()` or `createConnection()`. See http://mongoosejs.com/docs/connections.html#use-mongo-client');

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

Connection.prototype.error = function(err, callback) {
  if (callback) {
    return callback(err);
  }
  this.emit('error', err);
};

/**
 * Handles opening the connection with the appropriate method based on connection type.
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._open = function(emit, callback) {
  this.readyState = STATES.connecting;
  this._closeCalled = false;

  var _this = this;

  var method = this.replica
      ? 'doOpenSet'
      : 'doOpen';

  // open connection
  this[method](function(err) {
    if (err) {
      _this.readyState = STATES.disconnected;
      if (_this._hasOpened) {
        if (callback) {
          callback(err);
        }
      } else {
        _this.error(err, emit && callback);
      }
      return;
    }

    _this.onOpen(callback);
  });
};

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function(callback) {
  var _this = this;

  function open(err, isAuth) {
    if (err) {
      _this.readyState = isAuth ? STATES.unauthorized : STATES.disconnected;
      _this.error(err, callback);
      return;
    }

    _this.readyState = STATES.connected;

    // avoid having the collection subscribe to our event emitter
    // to prevent 0.3 warning
    for (var i in _this.collections) {
      if (utils.object.hasOwnProperty(_this.collections, i)) {
        _this.collections[i].onOpen();
      }
    }

    callback && callback();
    _this.emit('open');
  }

  // re-authenticate if we're not already connected #3871
  if (this._readyState !== STATES.connected && this.shouldAuthenticate()) {
    _this.db.authenticate(_this.user, _this.pass, _this.options.auth, function(err) {
      open(err, true);
    });
  } else {
    open();
  }
};

/**
 * Opens the connection with a URI using `MongoClient.connect()`.
 *
 * @param {String} uri The URI to connect with.
 * @param {Object} [options] Passed on to http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect
 * @param {Function} [callback]
 * @returns {Connection} this
 * @api private
 */

Connection.prototype.openUri = function(uri, options, callback) {
  this.readyState = STATES.connecting;
  this._closeCalled = false;

  try {
    var parsed = muri(uri);
    this.name = parsed.db;
    this.host = parsed.hosts[0].host || parsed.hosts[0].ipc;
    this.port = parsed.hosts[0].port || 27017;
    if (parsed.auth) {
      this.user = parsed.auth.user;
      this.pass = parsed.auth.pass;
    }
  } catch (error) {
    this.error(error, callback);
    throw error;
  }

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  var Promise = PromiseProvider.get();
  var _this = this;

  if (options) {
    options = utils.clone(options, { retainKeyOrder: true });
    delete options.useMongoClient;
    var autoIndex = options.config && options.config.autoIndex != null ?
      options.config.autoIndex :
      options.autoIndex;
    if (autoIndex != null) {
      this.config.autoIndex = autoIndex !== false;
      delete options.config;
      delete options.autoIndex;
    }

    // Backwards compat
    if (options.user || options.pass) {
      options.auth = options.auth || {};
      options.auth.user = options.user;
      options.auth.password = options.pass;
      delete options.user;
      delete options.pass;
      this.user = options.auth.user;
      this.pass = options.auth.password;
    }
  }

  this._connectionOptions = options;

  var promise = new Promise.ES6(function(resolve, reject) {
    mongodb.MongoClient.connect(uri, options, function(error, db) {
      if (error) {
        _this.readyState = STATES.disconnected;
        if (_this.listeners('error').length) {
          _this.emit('error', error);
        }
        callback && callback(error);
        return reject(error);
      }
      // Backwards compat for mongoose 4.x
      db.on('reconnect', function() {
        _this.readyState = STATES.connected;
        _this.emit('reconnect');
        _this.emit('reconnected');
      });
      db.s.topology.on('reconnectFailed', function() {
        _this.emit('reconnectFailed');
      });
      db.s.topology.on('close', function() {
        // Implicitly emits 'disconnected'
        _this.readyState = STATES.disconnected;
      });
      db.on('timeout', function() {
        _this.emit('timeout');
      });

      _this.db = db;
      _this.readyState = STATES.connected;

      for (var i in _this.collections) {
        if (utils.object.hasOwnProperty(_this.collections, i)) {
          _this.collections[i].onOpen();
        }
      }

      callback && callback(null, _this);
      delete _this.then;
      delete _this.catch;
      resolve(_this);
      _this.emit('open');
    });
  });

  this.then = function(resolve, reject) {
    return promise.then(resolve, reject);
  };
  this.catch = function(reject) {
    return promise.catch(reject);
  };

  return this;
};

/**
 * Closes the connection
 *
 * @param {Boolean} [force] optional
 * @param {Function} [callback] optional
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function(force, callback) {
  var _this = this;
  var Promise = PromiseProvider.get();

  if (typeof force === 'function') {
    callback = force;
    force = false;
  }

  this.$wasForceClosed = !!force;

  return new Promise.ES6(function(resolve, reject) {
    _this._close(force, function(error) {
      callback && callback(error);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

/**
 * Handles closing the connection
 *
 * @param {Boolean} force
 * @param {Function} callback
 * @api private
 */
Connection.prototype._close = function(force, callback) {
  var _this = this;
  this._closeCalled = true;

  switch (this.readyState) {
    case 0: // disconnected
      callback && callback();
      break;

    case 1: // connected
    case 4: // unauthorized
      this.readyState = STATES.disconnecting;
      this.doClose(force, function(err) {
        if (err) {
          _this.error(err, callback);
        } else {
          _this.onClose(force);
          callback && callback();
        }
      });
      break;

    case 2: // connecting
      this.once('open', function() {
        _this.close(callback);
      });
      break;

    case 3: // disconnecting
      if (!callback) {
        break;
      }
      this.once('close', function() {
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

Connection.prototype.onClose = function(force) {
  this.readyState = STATES.disconnected;

  // avoid having the collection subscribe to our event emitter
  // to prevent 0.3 warning
  for (var i in this.collections) {
    if (utils.object.hasOwnProperty(this.collections, i)) {
      this.collections[i].onClose(force);
    }
  }

  this.emit('close', force);
};

/**
 * Retrieves a collection, creating it if not cached.
 *
 * Not typically needed by applications. Just talk to your collection through your model.
 *
 * @param {String} name of the collection
 * @param {Object} [options] optional collection options
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function(name, options) {
  options = options ? utils.clone(options, { retainKeyOrder: true }) : {};
  options.$wasForceClosed = this.$wasForceClosed;
  if (!(name in this.collections)) {
    this.collections[name] = new Collection(name, this, options);
  }
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
 * _When no `collection` argument is passed, Mongoose produces a collection name by passing the model `name` to the [utils.toCollectionName](#utils_exports.toCollectionName) method. This method pluralizes the name. If you don't like this behavior, either pass a collection name or set your schemas collection name option._
 *
 * ####Example:
 *
 *     var schema = new Schema({ name: String }, { collection: 'actor' });
 *
 *     // or
 *
 *     schema.set('collection', 'actor');
 *
 *     // or
 *
 *     var collectionName = 'actor'
 *     var M = conn.model('Actor', schema, collectionName)
 *
 * @param {String} name the model name
 * @param {Schema} [schema] a schema. necessary when defining a model
 * @param {String} [collection] name of mongodb collection (optional) if not given it will be induced from model name
 * @see Mongoose#model #index_Mongoose-model
 * @return {Model} The compiled model
 * @api public
 */

Connection.prototype.model = function(name, schema, collection) {
  // collection name discovery
  if (typeof schema === 'string') {
    collection = schema;
    schema = false;
  }

  if (utils.isObject(schema) && !schema.instanceOfSchema) {
    schema = new Schema(schema);
  }
  if (schema && !schema.instanceOfSchema) {
    throw new Error('The 2nd parameter to `mongoose.model()` should be a ' +
      'schema or a POJO');
  }

  if (this.models[name] && !collection) {
    // model exists but we are not subclassing with custom collection
    if (schema && schema.instanceOfSchema && schema !== this.models[name].schema) {
      throw new MongooseError.OverwriteModelError(name);
    }
    return this.models[name];
  }

  var opts = {cache: false, connection: this};
  var model;

  if (schema && schema.instanceOfSchema) {
    // compile a model
    model = this.base.model(name, schema, collection, opts);

    // only the first model with this name is cached to allow
    // for one-offs with custom collection names etc.
    if (!this.models[name]) {
      this.models[name] = model;
    }

    model.init();
    return model;
  }

  if (this.models[name] && collection) {
    // subclassing current model with alternate collection
    model = this.models[name];
    schema = model.prototype.schema;
    var sub = model.__subclass(this, schema, collection);
    // do not cache the sub model
    return sub;
  }

  // lookup model in mongoose module
  model = this.base.models[name];

  if (!model) {
    throw new MongooseError.MissingSchemaError(name);
  }

  if (this === model.prototype.db
      && (!collection || collection === model.collection.name)) {
    // model already uses this connection.

    // only the first model with this name is cached to allow
    // for one-offs with custom collection names etc.
    if (!this.models[name]) {
      this.models[name] = model;
    }

    return model;
  }
  this.models[name] = model.__subclass(this, schema, collection);
  return this.models[name];
};

/**
 * Returns an array of model names created on this connection.
 * @api public
 * @return {Array}
 */

Connection.prototype.modelNames = function() {
  return Object.keys(this.models);
};

/**
 * @brief Returns if the connection requires authentication after it is opened. Generally if a
 * username and password are both provided than authentication is needed, but in some cases a
 * password is not required.
 * @api private
 * @return {Boolean} true if the connection should be authenticated after it is opened, otherwise false.
 */
Connection.prototype.shouldAuthenticate = function() {
  return (this.user !== null && this.user !== void 0) &&
      ((this.pass !== null || this.pass !== void 0) || this.authMechanismDoesNotRequirePassword());
};

/**
 * @brief Returns a boolean value that specifies if the current authentication mechanism needs a
 * password to authenticate according to the auth objects passed into the open/openSet methods.
 * @api private
 * @return {Boolean} true if the authentication mechanism specified in the options object requires
 *  a password, otherwise false.
 */
Connection.prototype.authMechanismDoesNotRequirePassword = function() {
  if (this.options && this.options.auth) {
    return authMechanismsWhichDontRequirePassword.indexOf(this.options.auth.authMechanism) >= 0;
  }
  return true;
};

/**
 * @brief Returns a boolean value that specifies if the provided objects object provides enough
 * data to authenticate with. Generally this is true if the username and password are both specified
 * but in some authentication methods, a password is not required for authentication so only a username
 * is required.
 * @param {Object} [options] the options object passed into the open/openSet methods.
 * @api private
 * @return {Boolean} true if the provided options object provides enough data to authenticate with,
 *   otherwise false.
 */
Connection.prototype.optionsProvideAuthenticationData = function(options) {
  return (options) &&
      (options.user) &&
      ((options.pass) || this.authMechanismDoesNotRequirePassword());
};

/*!
 * Module exports.
 */

Connection.STATES = STATES;
module.exports = Connection;
