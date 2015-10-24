/*!
 * Module dependencies.
 */

var utils = require('./utils')
  , EventEmitter = require('events').EventEmitter
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
  , Schema = require('./schema')
  , Collection = require(driver + '/collection')
  , STATES = require('./connectionstate')
  , MongooseError = require('./error')
  , muri = require('muri');

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
 * @event `fullsetup`: Emitted in a replica-set scenario, when all nodes specified in the connection string are connected.
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
  get: function() { return this._readyState; }
  , set: function(val) {
      if (!(val in STATES)) {
        throw new Error('Invalid connection state: ' + val);
      }

      if (this._readyState !== val) {
        this._readyState = val;
        // loop over the otherDbs on this connection and change their state
        for (var i = 0; i < this.otherDbs.length; i++) {
          this.otherDbs[i].readyState = val;
        }

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
 * A hash of the global options that are associated with this connection
 *
 * @property global
 */

Connection.prototype.config;

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

Connection.prototype.open = function(host, database, port, options, callback) {
  var parsed;

  if ('string' === typeof database) {
    switch (arguments.length) {
      case 2:
        port = 27017;
        break;
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

    try {
      parsed = muri(host);
    } catch (err) {
      this.error(err, callback);
      return this;
    }

    database = parsed.db;
    host = parsed.hosts[0].host || parsed.hosts[0].ipc;
    port = parsed.hosts[0].port || 27017;
  }

  this.options = this.parseOptions(options, parsed && parsed.options);

  // make sure we can open
  if (STATES.disconnected !== this.readyState) {
    var err = new Error('Trying to open unclosed connection.');
    err.state = this.readyState;
    this.error(err, callback);
    return this;
  }

  if (!host) {
    this.error(new Error('Missing hostname.'), callback);
    return this;
  }

  if (!database) {
    this.error(new Error('Missing database name.'), callback);
    return this;
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
    var auth = host.shift().split(':');
    host = host.pop();
    this.user = auth[0];
    this.pass = auth[1];

  } else {
    this.user = this.pass = undefined;
  }

  // global configuration options
  if (options && options.config) {
    if (options.config.autoIndex === false) {
      this.config.autoIndex = false;
    }
    else {
      this.config.autoIndex = true;
    }

  }

  this.name = database;
  this.host = host;
  this.port = port;

  this._open(callback);
  return this;
};

/**
 * Opens the connection to a replica set.
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
 * @param {String} uris comma-separated mongodb:// `URI`s
 * @param {String} [database] database name if not included in `uris`
 * @param {Object} [options] passed to the internal driver
 * @param {Function} [callback]
 * @see node-mongodb-native https://github.com/mongodb/node-mongodb-native
 * @see http://mongodb.github.com/node-mongodb-native/api-generated/db.html#authenticate
 * @api public
 */

Connection.prototype.openSet = function(uris, database, options, callback) {
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

      if ('function' === typeof options) {
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
          callback = database, database = null;
          break;
        case 'object':
          options = database, database = null;
          break;
      }
  }

  var parsed;
  try {
    parsed = muri(uris);
  } catch (err) {
    this.error(err, callback);
    return this;
  }

  if (!this.name) {
    this.name = parsed.db;
  }

  this.hosts = parsed.hosts;
  this.options = this.parseOptions(options, parsed && parsed.options);
  this.replica = true;

  if (!this.name) {
    this.error(new Error('No database name provided for replica set'), callback);
    return this;
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
    if (options.config.autoIndex === false) {
      this.config.autoIndex = false;
    }
    else {
      this.config.autoIndex = true;
    }

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

Connection.prototype.error = function(err, callback) {
  if (callback) return callback(err);
  this.emit('error', err);
};

/**
 * Handles opening the connection with the appropriate method based on connection type.
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._open = function(callback) {
  this.readyState = STATES.connecting;
  this._closeCalled = false;

  var self = this;

  var method = this.replica
    ? 'doOpenSet'
    : 'doOpen';

  // open connection
  this[method](function(err) {
    if (err) {
      self.readyState = STATES.disconnected;
      if (self._hasOpened) {
        if (callback) callback(err);
      } else {
        self.error(err, callback);
      }
      return;
    }

    self.onOpen(callback);
  });
};

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function(callback) {
  var self = this;

  function open(err, isAuth) {
    if (err) {
      self.readyState = isAuth ? STATES.unauthorized : STATES.disconnected;
      if (self._hasOpened) {
        if (callback) callback(err);
      } else {
        self.error(err, callback);
      }
      return;
    }

    self.readyState = STATES.connected;

    // avoid having the collection subscribe to our event emitter
    // to prevent 0.3 warning
    for (var i in self.collections)
      self.collections[i].onOpen();

    callback && callback();
    self.emit('open');
  }

  // re-authenticate
  if (this.shouldAuthenticate()) {
    self.db.authenticate(self.user, self.pass, self.options.auth, function(err) {
      open(err, true);
    });
  } else {
    open();
  }
};

/**
 * Closes the connection
 *
 * @param {Function} [callback] optional
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function(callback) {
  var self = this;
  this._closeCalled = true;

  switch (this.readyState) {
    case 0: // disconnected
      callback && callback();
      break;

    case 1: // connected
    case 4: // unauthorized
      this.readyState = STATES.disconnecting;
      this.doClose(function(err) {
        if (err) {
          self.error(err, callback);
        } else {
          self.onClose();
          callback && callback();
        }
      });
      break;

    case 2: // connecting
      this.once('open', function() {
        self.close(callback);
      });
      break;

    case 3: // disconnecting
      if (!callback) break;
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

Connection.prototype.onClose = function() {
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
 * Not typically needed by applications. Just talk to your collection through your model.
 *
 * @param {String} name of the collection
 * @param {Object} [options] optional collection options
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function(name, options) {
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
  if ('string' == typeof schema) {
    collection = schema;
    schema = false;
  }

  if (utils.isObject(schema) && !(schema instanceof Schema)) {
    schema = new Schema(schema);
  }

  if (this.models[name] && !collection) {
    // model exists but we are not subclassing with custom collection
    if (schema instanceof Schema && schema != this.models[name].schema) {
      throw new MongooseError.OverwriteModelError(name);
    }
    return this.models[name];
  }

  var opts = { cache: false, connection: this };
  var model;

  if (schema instanceof Schema) {
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

  if (this == model.prototype.db
      && (!collection || collection == model.collection.name)) {
    // model already uses this connection.

    // only the first model with this name is cached to allow
    // for one-offs with custom collection names etc.
    if (!this.models[name]) {
      this.models[name] = model;
    }

    return model;
  }

  return this.models[name] = model.__subclass(this, schema, collection);
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
  return (this.user != null) &&
    ((this.pass != null) || this.authMechanismDoesNotRequirePassword());
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
