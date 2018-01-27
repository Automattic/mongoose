'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;
const driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';
const Schema = require('./schema');
const Collection = require(driver + '/collection');
const STATES = require('./connectionstate');
const MongooseError = require('./error');
const PromiseProvider = require('./promise_provider');
const mongodb = require('mongodb');
const utils = require('./utils');

const parser = require('mongodb/lib/url_parser');

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
 * @memberOf Connection
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
 * @memberOf Connection
 * @api public
 */

Connection.prototype.collections;

/**
 * The mongodb.Db instance, set when the connection is opened
 *
 * @property db
 * @memberOf Connection
 * @api public
 */

Connection.prototype.db;

/**
 * A hash of the global options that are associated with this connection
 *
 * @property config
 * @memberOf Connection
 * @api public
 */

Connection.prototype.config;

/**
 * Helper for `createCollection()`. Will explicitly create the given collection
 * with specified options. Used to create [capped collections](https://docs.mongodb.com/manual/core/capped-collections/)
 * and [views](https://docs.mongodb.com/manual/core/views/) from mongoose.
 *
 * Options are passed down without modification to the [MongoDB driver's `createCollection()` function](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html#createCollection)
 *
 * @method createCollection
 * @param {string} collection The collection to delete
 * @param {Object} [options] see [MongoDB driver docs](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html#createCollection)
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Connection.prototype.createCollection = _wrapConnHelper(function createCollection(collection, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  this.db.createCollection(collection, options, cb);
});

/**
 * Helper for `dropCollection()`. Will delete the given collection, including
 * all documents and indexes.
 *
 * @method dropCollection
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
 * @method dropDatabase
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
    var cb = arguments.length > 0 ? arguments[arguments.length - 1] : null;
    var argsWithoutCb = typeof cb === 'function' ?
      Array.prototype.slice.call(arguments, 0, arguments.length - 1) :
      Array.prototype.slice.call(arguments);
    return utils.promiseOrCallback(cb, cb => {
      if (this.readyState !== STATES.connected) {
        this.on('open', function() {
          fn.apply(this, argsWithoutCb.concat([function(error) {
            cb(error);
          }]));
        });
      } else {
        fn.apply(this, argsWithoutCb.concat([function(error) {
          cb(error);
        }]));
      }
    });
  };
}

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
    callback(err);
    return null;
  }
  if (this.listeners('error').length > 0) {
    this.emit('error', err);
  }
  return Promise.reject(err);
};

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function() {
  this.readyState = STATES.connected;

  // avoid having the collection subscribe to our event emitter
  // to prevent 0.3 warning
  for (var i in this.collections) {
    if (utils.object.hasOwnProperty(this.collections, i)) {
      this.collections[i].onOpen();
    }
  }

  this.emit('open');
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

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  var Promise = PromiseProvider.get();
  var _this = this;

  if (options) {
    options = utils.clone(options);
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
      this.user = options.auth.user;
      this.pass = options.auth.password;
    }
    delete options.user;
    delete options.pass;

    if (options.bufferCommands != null) {
      options.bufferMaxEntries = 0;
      this.config.bufferCommands = options.bufferCommands;
      delete options.bufferCommands;
    }

    if (options.useMongoClient != null) {
      handleUseMongoClient(options);
    }
  } else {
    options = {};
  }

  this._connectionOptions = options;

  var promise = new Promise((resolve, reject) => {
    parser(uri, options, (error, parsed) => {
      if (error) {
        if (_this.listeners('error').length > 0) {
          _this.emit('error', error);
        }
        return reject(error);
      }

      this.name = parsed.dbName;
      this.host = parsed.servers[0].host || parsed.servers[0].domain_socket;
      this.port = parsed.servers[0].port || 27017;
      if (parsed.auth) {
        this.user = parsed.auth.user;
        this.pass = parsed.auth.password;
      }
      if (!('promiseLibrary' in options)) {
        options.promiseLibrary = PromiseProvider.get();
      }

      mongodb.MongoClient.connect(uri, options, function(error, client) {
        if (error) {
          if (_this.listeners('error').length > 0) {
            _this.emit('error', error);
          }
          return reject(error);
        }
        var db = client.db(parsed.dbName);
        _this.db = db;
        _this.client = client;

        if (error) {
          _this.readyState = STATES.disconnected;
          if (_this.listeners('error').length) {
            _this.emit('error', error);
          }
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
        db.s.topology.on('left', function(data) {
          _this.emit('left', data);
        });
        db.s.topology.on('joined', function(data) {
          _this.emit('joined', data);
        });
        db.s.topology.on('fullsetup', function(data) {
          _this.emit('fullsetup', data);
        });
        db.on('close', function() {
          // Implicitly emits 'disconnected'
          _this.readyState = STATES.disconnected;
        });
        db.on('timeout', function() {
          _this.emit('timeout');
        });

        delete _this.then;
        delete _this.catch;
        _this.readyState = STATES.connected;

        for (var i in _this.collections) {
          if (utils.object.hasOwnProperty(_this.collections, i)) {
            _this.collections[i].onOpen();
          }
        }

        resolve(_this);
        _this.emit('open');
      });
    });
  });

  if (callback != null) {
    promise.then(() => callback(null, this), err => callback(err));
  }

  this.$initialConnection = promise;
  this.then = function(resolve, reject) {
    return promise.then(resolve, reject);
  };
  this.catch = function(reject) {
    return promise.catch(reject);
  };

  return this;
};

/*!
 * ignore
 */

const handleUseMongoClient = function handleUseMongoClient(options) {
  console.warn('WARNING: The `useMongoClient` option is no longer ' +
    'necessary in mongoose 5.x, please remove it.');
  const stack = new Error().stack;
  console.warn(stack.substr(stack.indexOf('\n') + 1));
  delete options.useMongoClient;
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
  if (typeof force === 'function') {
    callback = force;
    force = false;
  }

  this.$wasForceClosed = !!force;

  return utils.promiseOrCallback(callback, cb => {
    this._close(force, cb);
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
      callback();
      break;

    case 1: // connected
      this.readyState = STATES.disconnecting;
      this.doClose(force, function(err) {
        if (err) {
          return callback(err);
        }
        _this.onClose(force);
        callback(null);
      });

      break;
    case 2: // connecting
      this.once('open', function() {
        _this.close(callback);
      });
      break;

    case 3: // disconnecting
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
  options = options ? utils.clone(options) : {};
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

    // Errors handled internally, so safe to ignore error
    model.init(() => {});
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
