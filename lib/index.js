'use strict';

/*!
 * Module dependencies.
 */

if (global.MONGOOSE_DRIVER_PATH) {
  const deprecationWarning = 'The `MONGOOSE_DRIVER_PATH` global property is ' +
    'deprecated. Use `mongoose.driver.set()` instead.';
  const setDriver = require('util').deprecate(function() {
    require('./driver').set(require(global.MONGOOSE_DRIVER_PATH));
  }, deprecationWarning);
  setDriver();
} else {
  require('./driver').set(require('./drivers/node-mongodb-native'));
}

const Document = require('./document');
const Schema = require('./schema');
const SchemaType = require('./schematype');
const SchemaTypes = require('./schema/index');
const VirtualType = require('./virtualtype');
const STATES = require('./connectionstate');
const VALID_OPTIONS = require('./validoptions');
const Types = require('./types');
const Query = require('./query');
const Model = require('./model');
const applyPlugins = require('./helpers/schema/applyPlugins');
const get = require('./helpers/get');
const promiseOrCallback = require('./helpers/promiseOrCallback');
const legacyPluralize = require('mongoose-legacy-pluralize');
const utils = require('./utils');
const pkg = require('../package.json');
const cast = require('./cast');
const removeSubdocs = require('./plugins/removeSubdocs');
const saveSubdocs = require('./plugins/saveSubdocs');
const validateBeforeSave = require('./plugins/validateBeforeSave');

const Aggregate = require('./aggregate');
const PromiseProvider = require('./promise_provider');
const shardingPlugin = require('./plugins/sharding');

const defaultMongooseSymbol = Symbol.for('mongoose:default');

require('./helpers/printJestWarning');

/**
 * Mongoose constructor.
 *
 * The exports object of the `mongoose` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * ####Example:
 *     const mongoose = require('mongoose');
 *     mongoose instanceof mongoose.Mongoose; // true
 *
 *     // Create a new Mongoose instance with its own `connect()`, `set()`, `model()`, etc.
 *     const m = new mongoose.Mongoose();
 *
 * @api public
 * @param {Object} options see [`Mongoose#set()` docs](/docs/api/mongoose.html#mongoose_Mongoose-set)
 */
function Mongoose(options) {
  this.connections = [];
  this.models = {};
  this.modelSchemas = {};
  // default global options
  this.options = Object.assign({
    pluralization: true
  }, options);
  const conn = this.createConnection(); // default connection
  conn.models = this.models;

  if (this.options.pluralization) {
    this._pluralize = legacyPluralize;
  }

  // If a user creates their own Mongoose instance, give them a separate copy
  // of the `Schema` constructor so they get separate custom types. (gh-6933)
  if (!options || !options[defaultMongooseSymbol]) {
    const _this = this;
    this.Schema = function() {
      this.base = _this;
      return Schema.apply(this, arguments);
    };
    this.Schema.prototype = Object.create(Schema.prototype);

    Object.assign(this.Schema, Schema);
    this.Schema.base = this;
    this.Schema.Types = Object.assign({}, Schema.Types);
  } else {
    // Hack to work around babel's strange behavior with
    // `import mongoose, { Schema } from 'mongoose'`. Because `Schema` is not
    // an own property of a Mongoose global, Schema will be undefined. See gh-5648
    for (const key of ['Schema', 'model']) {
      this[key] = Mongoose.prototype[key];
    }
  }
  this.Schema.prototype.base = this;

  Object.defineProperty(this, 'plugins', {
    configurable: false,
    enumerable: true,
    writable: false,
    value: [
      [saveSubdocs, { deduplicate: true }],
      [validateBeforeSave, { deduplicate: true }],
      [shardingPlugin, { deduplicate: true }],
      [removeSubdocs, { deduplicate: true }]
    ]
  });
}
Mongoose.prototype.cast = cast;
/**
 * Expose connection states for user-land
 *
 * @memberOf Mongoose
 * @property STATES
 * @api public
 */
Mongoose.prototype.STATES = STATES;

/**
 * The underlying driver this Mongoose instance uses to communicate with
 * the database. A driver is a Mongoose-specific interface that defines functions
 * like `find()`.
 *
 * @memberOf Mongoose
 * @property driver
 * @api public
 */

Mongoose.prototype.driver = require('./driver');

/**
 * Sets mongoose options
 *
 * ####Example:
 *
 *     mongoose.set('test', value) // sets the 'test' option to `value`
 *
 *     mongoose.set('debug', true) // enable logging collection methods + arguments to the console/file
 *
 *     mongoose.set('debug', function(collectionName, methodName, ...methodArgs) {}); // use custom function to log collection methods + arguments
 *
 * Currently supported options are:
 * - 'debug': If `true`, prints the operations mongoose sends to MongoDB to the console. If a writable stream is passed, it will log to that stream, without colorization. If a callback function is passed, it will receive the collection name, the method name, then all arugments passed to the method. For example, if you wanted to replicate the default logging, you could output from the callback `Mongoose: ${collectionName}.${methodName}(${methodArgs.join(', ')})`.
 * - 'bufferCommands': enable/disable mongoose's buffering mechanism for all connections and models
 * - 'useCreateIndex': false by default. Set to `true` to make Mongoose's default index build use `createIndex()` instead of `ensureIndex()` to avoid deprecation warnings from the MongoDB driver.
 * - 'useFindAndModify': true by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`.
 * - 'useNewUrlParser': false by default. Set to `true` to make all connections set the `useNewUrlParser` option by default
 * - 'useUnifiedTopology': false by default. Set to `true` to make all connections set the `useUnifiedTopology` option by default
 * - 'cloneSchemas': false by default. Set to `true` to `clone()` all schemas before compiling into a model.
 * - 'applyPluginsToDiscriminators': false by default. Set to true to apply global plugins to discriminator schemas. This typically isn't necessary because plugins are applied to the base schema and discriminators copy all middleware, methods, statics, and properties from the base schema.
 * - 'applyPluginsToChildSchemas': true by default. Set to false to skip applying global plugins to child schemas
 * - 'objectIdGetter': true by default. Mongoose adds a getter to MongoDB ObjectId's called `_id` that returns `this` for convenience with populate. Set this to false to remove the getter.
 * - 'runValidators': false by default. Set to true to enable [update validators](/docs/validation.html#update-validators) for all validators by default.
 * - 'toObject': `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to [`toObject()`](/docs/api.html#document_Document-toObject)
 * - 'toJSON': `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to [`toJSON()`](/docs/api.html#document_Document-toJSON), for determining how Mongoose documents get serialized by `JSON.stringify()`
 * - 'strict': true by default, may be `false`, `true`, or `'throw'`. Sets the default strict mode for schemas.
 * - 'selectPopulatedPaths': true by default. Set to false to opt out of Mongoose adding all fields that you `populate()` to your `select()`. The schema-level option `selectPopulatedPaths` overwrites this one.
 * - 'typePojoToMixed': true by default, may be `false` or `true`. Sets the default typePojoToMixed for schemas.
 * - 'maxTimeMS': If set, attaches [maxTimeMS](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/) to every query
 * - 'autoIndex': true by default. Set to false to disable automatic index creation for all models associated with this Mongoose instance.
 *
 * @param {String} key
 * @param {String|Function|Boolean} value
 * @api public
 */

Mongoose.prototype.set = function(key, value) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  if (VALID_OPTIONS.indexOf(key) === -1) throw new Error(`\`${key}\` is an invalid option.`);

  if (arguments.length === 1) {
    return _mongoose.options[key];
  }

  _mongoose.options[key] = value;

  if (key === 'objectIdGetter') {
    if (value) {
      Object.defineProperty(mongoose.Types.ObjectId.prototype, '_id', {
        enumerable: false,
        configurable: true,
        get: function() {
          return this;
        }
      });
    } else {
      delete mongoose.Types.ObjectId.prototype._id;
    }
  }

  return _mongoose;
};

/**
 * Gets mongoose options
 *
 * ####Example:
 *
 *     mongoose.get('test') // returns the 'test' value
 *
 * @param {String} key
 * @method get
 * @api public
 */

Mongoose.prototype.get = Mongoose.prototype.set;

/**
 * Creates a Connection instance.
 *
 * Each `connection` instance maps to a single database. This method is helpful when managing multiple db connections.
 *
 *
 * _Options passed take precedence over options included in connection strings._
 *
 * ####Example:
 *
 *     // with mongodb:// URI
 *     db = mongoose.createConnection('mongodb://user:pass@localhost:port/database');
 *
 *     // and options
 *     var opts = { db: { native_parser: true }}
 *     db = mongoose.createConnection('mongodb://user:pass@localhost:port/database', opts);
 *
 *     // replica sets
 *     db = mongoose.createConnection('mongodb://user:pass@localhost:port,anotherhost:port,yetanother:port/database');
 *
 *     // and options
 *     var opts = { replset: { strategy: 'ping', rs_name: 'testSet' }}
 *     db = mongoose.createConnection('mongodb://user:pass@localhost:port,anotherhost:port,yetanother:port/database', opts);
 *
 *     // and options
 *     var opts = { server: { auto_reconnect: false }, user: 'username', pass: 'mypassword' }
 *     db = mongoose.createConnection('localhost', 'database', port, opts)
 *
 *     // initialize now, connect later
 *     db = mongoose.createConnection();
 *     db.openUri('localhost', 'database', port, [opts]);
 *
 * @param {String} [uri] a mongodb:// URI
 * @param {Object} [options] passed down to the [MongoDB driver's `connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html), except for 4 mongoose-specific options explained below.
 * @param {Boolean} [options.bufferCommands=true] Mongoose specific option. Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
 * @param {String} [options.dbName] The name of the database we want to use. If not provided, use database name from connection string.
 * @param {String} [options.user] username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility.
 * @param {String} [options.pass] password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
 * @param {Boolean} [options.autoIndex=true] Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
 * @param {Boolean} [options.useNewUrlParser=false] False by default. Set to `true` to make all connections set the `useNewUrlParser` option by default.
 * @param {Boolean} [options.useUnifiedTopology=false] False by default. Set to `true` to make all connections set the `useUnifiedTopology` option by default.
 * @param {Boolean} [options.useCreateIndex=true] Mongoose-specific option. If `true`, this connection will use [`createIndex()` instead of `ensureIndex()`](/docs/deprecations.html#ensureindex) for automatic index builds via [`Model.init()`](/docs/api.html#model_Model.init).
 * @param {Boolean} [options.useFindAndModify=true] True by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`.
 * @param {Number} [options.reconnectTries=30] If you're connected to a single server or mongos proxy (as opposed to a replica set), the MongoDB driver will try to reconnect every `reconnectInterval` milliseconds for `reconnectTries` times, and give up afterward. When the driver gives up, the mongoose connection emits a `reconnectFailed` event. This option does nothing for replica set connections.
 * @param {Number} [options.reconnectInterval=1000] See `reconnectTries` option above.
 * @param {Class} [options.promiseLibrary] Sets the [underlying driver's promise library](http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html).
 * @param {Number} [options.poolSize=5] The maximum number of sockets the MongoDB driver will keep open for this connection. By default, `poolSize` is 5. Keep in mind that, as of MongoDB 3.4, MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](http://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
 * @param {Number} [options.bufferMaxEntries] This option does nothing if `useUnifiedTopology` is set. The MongoDB driver also has its own buffering mechanism that kicks in when the driver is disconnected. Set this option to 0 and set `bufferCommands` to `false` on your schemas if you want your database operations to fail immediately when the driver is not connected, as opposed to waiting for reconnection.
 * @param {Number} [options.connectTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _during initial connection_. Defaults to 30000. This option is passed transparently to [Node.js' `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback).
 * @param {Number} [options.socketTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. This is set to `30000` by default, you should set this to 2-3x your longest running operation if you expect some of your database operations to run longer than 20 seconds. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
 * @param {Number} [options.family=0] Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.
 * @return {Connection} the created Connection object. Connections are thenable, so you can do `await mongoose.createConnection()`
 * @api public
 */

Mongoose.prototype.createConnection = function(uri, options, callback) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  const conn = new Connection(_mongoose);
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  _mongoose.connections.push(conn);

  if (arguments.length > 0) {
    return conn.openUri(uri, options, callback);
  }

  return conn;
};

/**
 * Opens the default mongoose connection.
 *
 * ####Example:
 *
 *     mongoose.connect('mongodb://user:pass@localhost:port/database');
 *
 *     // replica sets
 *     var uri = 'mongodb://user:pass@localhost:port,anotherhost:port,yetanother:port/mydatabase';
 *     mongoose.connect(uri);
 *
 *     // with options
 *     mongoose.connect(uri, options);
 *
 *     // optional callback that gets fired when initial connection completed
 *     var uri = 'mongodb://nonexistent.domain:27000';
 *     mongoose.connect(uri, function(error) {
 *       // if error is truthy, the initial connection failed.
 *     })
 *
 * @param {String} uri(s)
 * @param {Object} [options] passed down to the [MongoDB driver's `connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html), except for 4 mongoose-specific options explained below.
 * @param {Boolean} [options.bufferCommands=true] Mongoose specific option. Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
 * @param {String} [options.dbName] The name of the database we want to use. If not provided, use database name from connection string.
 * @param {String} [options.user] username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility.
 * @param {String} [options.pass] password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
 * @param {Number} [options.poolSize=5] The maximum number of sockets the MongoDB driver will keep open for this connection. By default, `poolSize` is 5. Keep in mind that, as of MongoDB 3.4, MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](http://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
 * @param {Boolean} [options.useUnifiedTopology=false] False by default. Set to `true` to opt in to the MongoDB driver's replica set and sharded cluster monitoring engine.
 * @param {Number} [options.serverSelectionTimeoutMS] If `useUnifiedTopology = true`, the MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds before erroring out. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
 * @param {Number} [options.heartbeatFrequencyMS] If `useUnifiedTopology = true`, the MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.
 * @param {Boolean} [options.autoIndex=true] Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
 * @param {Boolean} [options.useNewUrlParser=false] False by default. Set to `true` to opt in to the MongoDB driver's new URL parser logic.
 * @param {Boolean} [options.useCreateIndex=true] Mongoose-specific option. If `true`, this connection will use [`createIndex()` instead of `ensureIndex()`](/docs/deprecations.html#ensureindex) for automatic index builds via [`Model.init()`](/docs/api.html#model_Model.init).
 * @param {Boolean} [options.useFindAndModify=true] True by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`.
 * @param {Number} [options.reconnectTries=30] If you're connected to a single server or mongos proxy (as opposed to a replica set), the MongoDB driver will try to reconnect every `reconnectInterval` milliseconds for `reconnectTries` times, and give up afterward. When the driver gives up, the mongoose connection emits a `reconnectFailed` event. This option does nothing for replica set connections.
 * @param {Number} [options.reconnectInterval=1000] See `reconnectTries` option above.
 * @param {Class} [options.promiseLibrary] Sets the [underlying driver's promise library](http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html).
 * @param {Number} [options.bufferMaxEntries] This option does nothing if `useUnifiedTopology` is set. The MongoDB driver also has its own buffering mechanism that kicks in when the driver is disconnected. Set this option to 0 and set `bufferCommands` to `false` on your schemas if you want your database operations to fail immediately when the driver is not connected, as opposed to waiting for reconnection.
 * @param {Number} [options.connectTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _during initial connection_. Defaults to 30000. This option is passed transparently to [Node.js' `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback).
 * @param {Number} [options.socketTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. This is set to `30000` by default, you should set this to 2-3x your longest running operation if you expect some of your database operations to run longer than 20 seconds. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
 * @param {Number} [options.family=0] Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.
 * @param {Function} [callback]
 * @see Mongoose#createConnection #index_Mongoose-createConnection
 * @api public
 * @return {Promise} resolves to `this` if connection succeeded
 */

Mongoose.prototype.connect = function(uri, options, callback) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;
  const conn = _mongoose.connection;
  return conn.openUri(uri, options, callback).then(() => _mongoose);
};

/**
 * Runs `.close()` on all connections in parallel.
 *
 * @param {Function} [callback] called after all connection close, or when first error occurred.
 * @return {Promise} resolves when all connections are closed, or rejects with the first error that occurred.
 * @api public
 */

Mongoose.prototype.disconnect = function(callback) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  return promiseOrCallback(callback, cb => {
    let remaining = _mongoose.connections.length;
    if (remaining <= 0) {
      return cb(null);
    }
    _mongoose.connections.forEach(conn => {
      conn.close(function(error) {
        if (error) {
          return cb(error);
        }
        if (!--remaining) {
          cb(null);
        }
      });
    });
  });
};

/**
 * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
 * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
 * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
 *
 * Calling `mongoose.startSession()` is equivalent to calling `mongoose.connection.startSession()`.
 * Sessions are scoped to a connection, so calling `mongoose.startSession()`
 * starts a session on the [default mongoose connection](/docs/api.html#mongoose_Mongoose-connection).
 *
 * @param {Object} [options] see the [mongodb driver options](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html#startSession)
 * @param {Boolean} [options.causalConsistency=true] set to false to disable causal consistency
 * @param {Function} [callback]
 * @return {Promise<ClientSession>} promise that resolves to a MongoDB driver `ClientSession`
 * @api public
 */

Mongoose.prototype.startSession = function() {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  return _mongoose.connection.startSession.apply(_mongoose.connection, arguments);
};

/**
 * Getter/setter around function for pluralizing collection names.
 *
 * @param {Function|null} [fn] overwrites the function used to pluralize collection names
 * @return {Function|null} the current function used to pluralize collection names, defaults to the legacy function from `mongoose-legacy-pluralize`.
 * @api public
 */

Mongoose.prototype.pluralize = function(fn) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  if (arguments.length > 0) {
    _mongoose._pluralize = fn;
  }
  return _mongoose._pluralize;
};

/**
 * Defines a model or retrieves it.
 *
 * Models defined on the `mongoose` instance are available to all connection
 * created by the same `mongoose` instance.
 *
 * If you call `mongoose.model()` with twice the same name but a different schema,
 * you will get an `OverwriteModelError`. If you call `mongoose.model()` with
 * the same name and same schema, you'll get the same schema back.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *
 *     // define an Actor model with this mongoose instance
 *     const schema = new Schema({ name: String });
 *     mongoose.model('Actor', schema);
 *
 *     // create a new connection
 *     var conn = mongoose.createConnection(..);
 *
 *     // create Actor model
 *     var Actor = conn.model('Actor', schema);
 *     conn.model('Actor') === Actor; // true
 *     conn.model('Actor', schema) === Actor; // true, same schema
 *     conn.model('Actor', schema, 'actors') === Actor; // true, same schema and collection name
 *
 *     // This throws an `OverwriteModelError` because the schema is different.
 *     conn.model('Actor', new Schema({ name: String }));
 *
 * _When no `collection` argument is passed, Mongoose uses the model name. If you don't like this behavior, either pass a collection name, use `mongoose.pluralize()`, or set your schemas collection name option._
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
 *     var M = mongoose.model('Actor', schema, collectionName)
 *
 * @param {String|Function} name model name or class extending Model
 * @param {Schema} [schema] the schema to use.
 * @param {String} [collection] name (optional, inferred from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @return {Model} The model associated with `name`. Mongoose will create the model if it doesn't already exist.
 * @api public
 */

Mongoose.prototype.model = function(name, schema, collection, skipInit) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  let model;
  if (typeof name === 'function') {
    model = name;
    name = model.name;
    if (!(model.prototype instanceof Model)) {
      throw new _mongoose.Error('The provided class ' + name + ' must extend Model');
    }
  }

  if (typeof schema === 'string') {
    collection = schema;
    schema = false;
  }

  if (utils.isObject(schema) && !(schema.instanceOfSchema)) {
    schema = new Schema(schema);
  }
  if (schema && !schema.instanceOfSchema) {
    throw new Error('The 2nd parameter to `mongoose.model()` should be a ' +
      'schema or a POJO');
  }

  if (typeof collection === 'boolean') {
    skipInit = collection;
    collection = null;
  }

  // handle internal options from connection.model()
  let options;
  if (skipInit && utils.isObject(skipInit)) {
    options = skipInit;
    skipInit = true;
  } else {
    options = {};
  }

  // look up schema for the collection.
  if (!_mongoose.modelSchemas[name]) {
    if (schema) {
      // cache it so we only apply plugins once
      _mongoose.modelSchemas[name] = schema;
    } else {
      throw new mongoose.Error.MissingSchemaError(name);
    }
  }

  const originalSchema = schema;
  if (schema) {
    if (_mongoose.get('cloneSchemas')) {
      schema = schema.clone();
    }
    _mongoose._applyPlugins(schema);
  }

  let sub;

  // connection.model() may be passing a different schema for
  // an existing model name. in this case don't read from cache.
  if (_mongoose.models[name] && options.cache !== false) {
    if (originalSchema &&
        originalSchema.instanceOfSchema &&
        originalSchema !== _mongoose.models[name].schema) {
      throw new _mongoose.Error.OverwriteModelError(name);
    }

    if (collection && collection !== _mongoose.models[name].collection.name) {
      // subclass current model with alternate collection
      model = _mongoose.models[name];
      schema = model.prototype.schema;
      sub = model.__subclass(_mongoose.connection, schema, collection);
      // do not cache the sub model
      return sub;
    }

    return _mongoose.models[name];
  }

  // ensure a schema exists
  if (!schema) {
    schema = this.modelSchemas[name];
    if (!schema) {
      throw new mongoose.Error.MissingSchemaError(name);
    }
  }

  // Apply relevant "global" options to the schema
  if (!('pluralization' in schema.options)) {
    schema.options.pluralization = _mongoose.options.pluralization;
  }

  if (!collection) {
    collection = schema.get('collection') ||
      utils.toCollectionName(name, _mongoose.pluralize());
  }

  const connection = options.connection || _mongoose.connection;
  model = _mongoose.Model.compile(model || name, schema, collection, connection, _mongoose);

  if (!skipInit) {
    // Errors handled internally, so safe to ignore error
    model.init(function $modelInitNoop() {});
  }

  if (options.cache === false) {
    return model;
  }

  _mongoose.models[name] = model;
  return _mongoose.models[name];
};

/**
 * Removes the model named `name` from the default connection, if it exists.
 * You can use this function to clean up any models you created in your tests to
 * prevent OverwriteModelErrors.
 *
 * Equivalent to `mongoose.connection.deleteModel(name)`.
 *
 * ####Example:
 *
 *     mongoose.model('User', new Schema({ name: String }));
 *     console.log(mongoose.model('User')); // Model object
 *     mongoose.deleteModel('User');
 *     console.log(mongoose.model('User')); // undefined
 *
 *     // Usually useful in a Mocha `afterEach()` hook
 *     afterEach(function() {
 *       mongoose.deleteModel(/.+/); // Delete every model
 *     });
 *
 * @api public
 * @param {String|RegExp} name if string, the name of the model to remove. If regexp, removes all models whose name matches the regexp.
 * @return {Mongoose} this
 */

Mongoose.prototype.deleteModel = function(name) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  _mongoose.connection.deleteModel(name);
  return _mongoose;
};

/**
 * Returns an array of model names created on this instance of Mongoose.
 *
 * ####Note:
 *
 * _Does not include names of models created using `connection.model()`._
 *
 * @api public
 * @return {Array}
 */

Mongoose.prototype.modelNames = function() {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  const names = Object.keys(_mongoose.models);
  return names;
};

/**
 * Applies global plugins to `schema`.
 *
 * @param {Schema} schema
 * @api private
 */

Mongoose.prototype._applyPlugins = function(schema, options) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  options = options || {};
  options.applyPluginsToDiscriminators = get(_mongoose,
    'options.applyPluginsToDiscriminators', false);
  options.applyPluginsToChildSchemas = get(_mongoose,
    'options.applyPluginsToChildSchemas', true);
  applyPlugins(schema, _mongoose.plugins, options, '$globalPluginsApplied');
};

/**
 * Declares a global plugin executed on all Schemas.
 *
 * Equivalent to calling `.plugin(fn)` on each Schema you create.
 *
 * @param {Function} fn plugin callback
 * @param {Object} [opts] optional options
 * @return {Mongoose} this
 * @see plugins ./plugins.html
 * @api public
 */

Mongoose.prototype.plugin = function(fn, opts) {
  const _mongoose = this instanceof Mongoose ? this : mongoose;

  _mongoose.plugins.push([fn, opts]);
  return _mongoose;
};

/**
 * The Mongoose module's default connection. Equivalent to `mongoose.connections[0]`, see [`connections`](#mongoose_Mongoose-connections).
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     mongoose.connect(...);
 *     mongoose.connection.on('error', cb);
 *
 * This is the connection used by default for every model created using [mongoose.model](#index_Mongoose-model).
 *
 * To create a new connection, use [`createConnection()`](#mongoose_Mongoose-createConnection).
 *
 * @memberOf Mongoose
 * @instance
 * @property {Connection} connection
 * @api public
 */

Mongoose.prototype.__defineGetter__('connection', function() {
  return this.connections[0];
});

Mongoose.prototype.__defineSetter__('connection', function(v) {
  if (v instanceof Connection) {
    this.connections[0] = v;
    this.models = v.models;
  }
});

/**
 * An array containing all [connections](connections.html) associated with this
 * Mongoose instance. By default, there is 1 connection. Calling
 * [`createConnection()`](#mongoose_Mongoose-createConnection) adds a connection
 * to this array.
 *
 * ####Example:
 *
 *     const mongoose = require('mongoose');
 *     mongoose.connections.length; // 1, just the default connection
 *     mongoose.connections[0] === mongoose.connection; // true
 *
 *     mongoose.createConnection('mongodb://localhost:27017/test');
 *     mongoose.connections.length; // 2
 *
 * @memberOf Mongoose
 * @instance
 * @property {Array} connections
 * @api public
 */

Mongoose.prototype.connections;

/*!
 * Driver dependent APIs
 */

const driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';

/*!
 * Connection
 */

const Connection = require(driver + '/connection');

/*!
 * Collection
 */

const Collection = require(driver + '/collection');

/**
 * The Mongoose Aggregate constructor
 *
 * @method Aggregate
 * @api public
 */

Mongoose.prototype.Aggregate = Aggregate;

/**
 * The Mongoose Collection constructor
 *
 * @method Collection
 * @api public
 */

Mongoose.prototype.Collection = Collection;

/**
 * The Mongoose [Connection](#connection_Connection) constructor
 *
 * @memberOf Mongoose
 * @instance
 * @method Connection
 * @api public
 */

Mongoose.prototype.Connection = Connection;

/**
 * The Mongoose version
 *
 * #### Example
 *
 *     console.log(mongoose.version); // '5.x.x'
 *
 * @property version
 * @api public
 */

Mongoose.prototype.version = pkg.version;

/**
 * The Mongoose constructor
 *
 * The exports of the mongoose module is an instance of this class.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var mongoose2 = new mongoose.Mongoose();
 *
 * @method Mongoose
 * @api public
 */

Mongoose.prototype.Mongoose = Mongoose;

/**
 * The Mongoose [Schema](#schema_Schema) constructor
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var Schema = mongoose.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */

Mongoose.prototype.Schema = Schema;

/**
 * The Mongoose [SchemaType](#schematype_SchemaType) constructor
 *
 * @method SchemaType
 * @api public
 */

Mongoose.prototype.SchemaType = SchemaType;

/**
 * The various Mongoose SchemaTypes.
 *
 * ####Note:
 *
 * _Alias of mongoose.Schema.Types for backwards compatibility._
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema.Types
 * @api public
 */

Mongoose.prototype.SchemaTypes = Schema.Types;

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */

Mongoose.prototype.VirtualType = VirtualType;

/**
 * The various Mongoose Types.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var array = mongoose.Types.Array;
 *
 * ####Types:
 *
 * - [ObjectId](#types-objectid-js)
 * - [Buffer](#types-buffer-js)
 * - [SubDocument](#types-embedded-js)
 * - [Array](#types-array-js)
 * - [DocumentArray](#types-documentarray-js)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = mongoose.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */

Mongoose.prototype.Types = Types;

/**
 * The Mongoose [Query](#query_Query) constructor.
 *
 * @method Query
 * @api public
 */

Mongoose.prototype.Query = Query;

/**
 * The Mongoose [Promise](#promise_Promise) constructor.
 *
 * @memberOf Mongoose
 * @instance
 * @property Promise
 * @api public
 */

Object.defineProperty(Mongoose.prototype, 'Promise', {
  get: function() {
    return PromiseProvider.get();
  },
  set: function(lib) {
    PromiseProvider.set(lib);
  }
});

/**
 * Storage layer for mongoose promises
 *
 * @method PromiseProvider
 * @api public
 */

Mongoose.prototype.PromiseProvider = PromiseProvider;

/**
 * The Mongoose [Model](#model_Model) constructor.
 *
 * @method Model
 * @api public
 */

Mongoose.prototype.Model = Model;

/**
 * The Mongoose [Document](/api/document.html) constructor.
 *
 * @method Document
 * @api public
 */

Mongoose.prototype.Document = Document;

/**
 * The Mongoose DocumentProvider constructor. Mongoose users should not have to
 * use this directly
 *
 * @method DocumentProvider
 * @api public
 */

Mongoose.prototype.DocumentProvider = require('./document_provider');

/**
 * The Mongoose ObjectId [SchemaType](/docs/schematypes.html). Used for
 * declaring paths in your schema that should be
 * [MongoDB ObjectIds](https://docs.mongodb.com/manual/reference/method/ObjectId/).
 * Do not use this to create a new ObjectId instance, use `mongoose.Types.ObjectId`
 * instead.
 *
 * ####Example:
 *
 *     const childSchema = new Schema({ parentId: mongoose.ObjectId });
 *
 * @property ObjectId
 * @api public
 */

Mongoose.prototype.ObjectId = SchemaTypes.ObjectId;

/**
 * Returns true if Mongoose can cast the given value to an ObjectId, or
 * false otherwise.
 *
 * ####Example:
 *
 *     mongoose.isValidObjectId(new mongoose.Types.ObjectId()); // true
 *     mongoose.isValidObjectId('0123456789ab'); // true
 *     mongoose.isValidObjectId(6); // false
 *
 * @method isValidObjectId
 * @api public
 */

Mongoose.prototype.isValidObjectId = function(v) {
  if (v == null) {
    return true;
  }
  const base = this || mongoose;
  const ObjectId = base.driver.get().ObjectId;
  if (v instanceof ObjectId) {
    return true;
  }

  if (v._id != null) {
    if (v._id instanceof ObjectId) {
      return true;
    }
    if (v._id.toString instanceof Function) {
      v = v._id.toString();
      return typeof v === 'string' && (v.length === 12 || v.length === 24);
    }
  }

  if (v.toString instanceof Function) {
    v = v.toString();
  }

  if (typeof v === 'string' && (v.length === 12 || v.length === 24)) {
    return true;
  }

  return false;
};

/**
 * The Mongoose Decimal128 [SchemaType](/docs/schematypes.html). Used for
 * declaring paths in your schema that should be
 * [128-bit decimal floating points](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html).
 * Do not use this to create a new Decimal128 instance, use `mongoose.Types.Decimal128`
 * instead.
 *
 * ####Example:
 *
 *     const vehicleSchema = new Schema({ fuelLevel: mongoose.Decimal128 });
 *
 * @property Decimal128
 * @api public
 */

Mongoose.prototype.Decimal128 = SchemaTypes.Decimal128;

/**
 * The Mongoose Mixed [SchemaType](/docs/schematypes.html). Used for
 * declaring paths in your schema that Mongoose's change tracking, casting,
 * and validation should ignore.
 *
 * ####Example:
 *
 *     const schema = new Schema({ arbitrary: mongoose.Mixed });
 *
 * @property Mixed
 * @api public
 */

Mongoose.prototype.Mixed = SchemaTypes.Mixed;

/**
 * The Mongoose Date [SchemaType](/docs/schematypes.html).
 *
 * ####Example:
 *
 *     const schema = new Schema({ test: Date });
 *     schema.path('test') instanceof mongoose.Date; // true
 *
 * @property Date
 * @api public
 */

Mongoose.prototype.Date = SchemaTypes.Date;

/**
 * The Mongoose Number [SchemaType](/docs/schematypes.html). Used for
 * declaring paths in your schema that Mongoose should cast to numbers.
 *
 * ####Example:
 *
 *     const schema = new Schema({ num: mongoose.Number });
 *     // Equivalent to:
 *     const schema = new Schema({ num: 'number' });
 *
 * @property Number
 * @api public
 */

Mongoose.prototype.Number = SchemaTypes.Number;

/**
 * The [MongooseError](#error_MongooseError) constructor.
 *
 * @method Error
 * @api public
 */

Mongoose.prototype.Error = require('./error/index');

/**
 * Mongoose uses this function to get the current time when setting
 * [timestamps](/docs/guide.html#timestamps). You may stub out this function
 * using a tool like [Sinon](https://www.npmjs.com/package/sinon) for testing.
 *
 * @method now
 * @returns Date the current time
 * @api public
 */

Mongoose.prototype.now = function now() { return new Date(); };

/**
 * The Mongoose CastError constructor
 *
 * @method CastError
 * @param {String} type The name of the type
 * @param {Any} value The value that failed to cast
 * @param {String} path The path `a.b.c` in the doc where this cast error occurred
 * @param {Error} [reason] The original error that was thrown
 * @api public
 */

Mongoose.prototype.CastError = require('./error/cast');

/**
 * The constructor used for schematype options
 *
 * @method SchemaTypeOptions
 * @api public
 */

Mongoose.prototype.SchemaTypeOptions = require('./options/SchemaTypeOptions');

/**
 * The [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver Mongoose uses.
 *
 * @property mongo
 * @api public
 */

Mongoose.prototype.mongo = require('mongodb');

/**
 * The [mquery](https://github.com/aheckmann/mquery) query builder Mongoose uses.
 *
 * @property mquery
 * @api public
 */

Mongoose.prototype.mquery = require('mquery');

/*!
 * The exports object is an instance of Mongoose.
 *
 * @api public
 */

const mongoose = module.exports = exports = new Mongoose({
  [defaultMongooseSymbol]: true
});
