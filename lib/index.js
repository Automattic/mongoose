'use strict';

/*!
 * Module dependencies.
 */

const driverPath = global.MONGOOSE_DRIVER_PATH ||
  './drivers/node-mongodb-native';
require('./driver').set(require(driverPath));

const Schema = require('./schema');
const SchemaType = require('./schematype');
const VirtualType = require('./virtualtype');
const STATES = require('./connectionstate');
const Types = require('./types');
const Query = require('./query');
const Model = require('./model');
const Document = require('./document');
const legacyPluralize = require('mongoose-legacy-pluralize');
const utils = require('./utils');
const pkg = require('../package.json');

const removeSubdocs = require('./plugins/removeSubdocs');
const saveSubdocs = require('./plugins/saveSubdocs');
const validateBeforeSave = require('./plugins/validateBeforeSave');

const Aggregate = require('./aggregate');
const PromiseProvider = require('./promise_provider');
const shardingPlugin = require('./plugins/sharding');

/**
 * Mongoose constructor.
 *
 * The exports object of the `mongoose` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * @api public
 */

function Mongoose() {
  this.connections = [];
  this.models = {};
  this.modelSchemas = {};
  // default global options
  this.options = {
    pluralization: true
  };
  const conn = this.createConnection(); // default connection
  conn.models = this.models;

  this._pluralize = legacyPluralize;

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

/**
 * Expose connection states for user-land
 *
 * @memberOf Mongoose
 * @property STATES
 * @api public
 */
Mongoose.prototype.STATES = STATES;

/**
 * Sets mongoose options
 *
 * ####Example:
 *
 *     mongoose.set('test', value) // sets the 'test' option to `value`
 *
 *     mongoose.set('debug', true) // enable logging collection methods + arguments to the console
 *
 *     mongoose.set('debug', function(collectionName, methodName, arg1, arg2...) {}); // use custom function to log collection methods + arguments
 *
 * Currently supported options are:
 * - 'debug': prints the operations mongoose sends to MongoDB to the console
 * - 'bufferCommands': enable/disable mongoose's buffering mechanism for all connections and models
 * - 'useCreateIndex': false by default. Set to `true` to make Mongoose's default index build use `createIndex()` instead of `ensureIndex()` to avoid deprecation warnings from the MongoDB driver.
 * - 'useFindAndModify': true by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`.
 * - 'useNewUrlParser': false by default. Set to `true` to make all connections set the `useNewUrlParser` option by default
 * - 'cloneSchemas': false by default. Set to `true` to `clone()` all schemas before compiling into a model.
 * - 'applyPluginsToDiscriminators': false by default. Set to true to apply global plugins to discriminator schemas. This typically isn't necessary because plugins are applied to the base schema and discriminators copy all middleware, methods, statics, and properties from the base schema.
 * - 'objectIdGetter': true by default. Mongoose adds a getter to MongoDB ObjectId's called `_id` that returns `this` for convenience with populate. Set this to false to remove the getter.
 * - 'runValidators': false by default. Set to true to enable [update validators](/docs/validation.html#update-validators) for all validators by default.
 * - 'selectPopulatedPaths': true by default. Set to false to opt out of Mongoose adding all fields that you `populate()` to your `select()`. The schema-level option `selectPopulatedPaths` overwrites this one.
 *
 * @param {String} key
 * @param {String|Function|Boolean} value
 * @api public
 */

Mongoose.prototype.set = function(key, value) {
  if (arguments.length === 1) {
    return this.options[key];
  }

  this.options[key] = value;

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

  return this;
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
 * Each `connection` instance maps to a single database. This method is helpful when mangaging multiple db connections.
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
 *     db.open('localhost', 'database', port, [opts]);
 *
 * @param {String} [uri] a mongodb:// URI
 * @param {Object} [options] passed down to the [MongoDB driver's `connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html), except for 4 mongoose-specific options explained below.
 * @param {String} [options.user] username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility.
 * @param {String} [options.pass] password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
 * @param {Boolean} [options.autoIndex=true] Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
 * @param {Boolean} [options.bufferCommands=true] Mongoose specific option. Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
 * @return {Connection} the created Connection object. Connections are thenable, so you can do `await mongoose.createConnection()`
 * @api public
 */

Mongoose.prototype.createConnection = function(uri, options, callback) {
  const conn = new Connection(this);
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  this.connections.push(conn);

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
 * @param {String} [options.dbName] The name of the database we want to use. If not provided, use database name from connection string.
 * @param {String} [options.user] username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility.
 * @param {String} [options.pass] password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
 * @param {Boolean} [options.autoIndex=true] Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
 * @param {Boolean} [options.bufferCommands=true] Mongoose specific option. Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
 * @param {Function} [callback]
 * @see Mongoose#createConnection #index_Mongoose-createConnection
 * @api public
 * @return {Promise} resolves to `this` if connection succeeded
 */

Mongoose.prototype.connect = function() {
  const conn = this.connection;
  return conn.openUri(arguments[0], arguments[1], arguments[2]).then(() => this);
};

/**
 * Runs `.close()` on all connections in parallel.
 *
 * @param {Function} [callback] called after all connection close, or when first error occurred.
 * @return {Promise} resolves when all connections are closed, or rejects with the first error that occurred.
 * @api public
 */

Mongoose.prototype.disconnect = function(callback) {
  return utils.promiseOrCallback(callback, cb => {
    let remaining = this.connections.length;
    if (remaining <= 0) {
      return cb(null);
    }
    this.connections.forEach(conn => {
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
  return this.connection.startSession.apply(this.connection, arguments);
};

/**
 * Getter/setter around function for pluralizing collection names.
 *
 * @param {Function|null} [fn] overwrites the function used to pluralize collection names
 * @return {Function|null} the current function used to pluralize collection names, defaults to the legacy function from `mongoose-legacy-pluralize`.
 * @api public
 */

Mongoose.prototype.pluralize = function(fn) {
  if (arguments.length > 0) {
    this._pluralize = fn;
  }
  return this._pluralize;
};

/**
 * Defines a model or retrieves it.
 *
 * Models defined on the `mongoose` instance are available to all connection created by the same `mongoose` instance.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *
 *     // define an Actor model with this mongoose instance
 *     mongoose.model('Actor', new Schema({ name: String }));
 *
 *     // create a new connection
 *     var conn = mongoose.createConnection(..);
 *
 *     // retrieve the Actor model
 *     var Actor = conn.model('Actor');
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
 * @param {Schema} [schema]
 * @param {String} [collection] name (optional, inferred from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @return {Model}
 * @api public
 */

Mongoose.prototype.model = function(name, schema, collection, skipInit) {
  let model;
  if (typeof name === 'function') {
    model = name;
    name = model.name;
    if (!(model.prototype instanceof Model)) {
      throw new mongoose.Error('The provided class ' + name + ' must extend Model');
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
  if (!this.modelSchemas[name]) {
    if (schema) {
      // cache it so we only apply plugins once
      this.modelSchemas[name] = schema;
    } else {
      throw new mongoose.Error.MissingSchemaError(name);
    }
  }

  const originalSchema = schema;
  if (schema) {
    if (this.get('cloneSchemas')) {
      schema = schema.clone();
    }
    this._applyPlugins(schema);
  }

  let sub;

  // connection.model() may be passing a different schema for
  // an existing model name. in this case don't read from cache.
  if (this.models[name] && options.cache !== false) {
    if (originalSchema && originalSchema.instanceOfSchema && originalSchema !== this.models[name].schema) {
      throw new mongoose.Error.OverwriteModelError(name);
    }

    if (collection) {
      // subclass current model with alternate collection
      model = this.models[name];
      schema = model.prototype.schema;
      sub = model.__subclass(this.connection, schema, collection);
      // do not cache the sub model
      return sub;
    }

    return this.models[name];
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
    schema.options.pluralization = this.options.pluralization;
  }

  if (!collection) {
    collection = schema.get('collection') ||
      utils.toCollectionName(name, this.pluralize());
  }

  const connection = options.connection || this.connection;
  model = this.Model.compile(model || name, schema, collection, connection, this);

  if (!skipInit) {
    // Errors handled internally, so safe to ignore error
    model.init(function $modelInitNoop() {});
  }

  if (options.cache === false) {
    return model;
  }

  this.models[name] = model;
  return this.models[name];
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
  const names = Object.keys(this.models);
  return names;
};

/**
 * Applies global plugins to `schema`.
 *
 * @param {Schema} schema
 * @api private
 */

Mongoose.prototype._applyPlugins = function(schema) {
  if (schema.$globalPluginsApplied) {
    return;
  }
  let i;
  let len;
  for (i = 0, len = this.plugins.length; i < len; ++i) {
    schema.plugin(this.plugins[i][0], this.plugins[i][1]);
  }
  schema.$globalPluginsApplied = true;
  for (i = 0, len = schema.childSchemas.length; i < len; ++i) {
    this._applyPlugins(schema.childSchemas[i].schema);
  }
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
  this.plugins.push([fn, opts]);
  return this;
};

/**
 * The default connection of the mongoose module.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     mongoose.connect(...);
 *     mongoose.connection.on('error', cb);
 *
 * This is the connection used by default for every model created using [mongoose.model](#index_Mongoose-model).
 *
 * @memberOf Mongoose
 * @instance
 * @property connection
 * @return {Connection}
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

/*!
 * Driver dependent APIs
 */

const driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';

/*!
 * Connection
 */

var Connection = require(driver + '/connection');

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
 * The Mongoose [Document](#document-js) constructor.
 *
 * @method Document
 * @api public
 */

Mongoose.prototype.Document = Document;

/**
 * The Mongoose DocumentProvider constructor.
 *
 * @method DocumentProvider
 * @api public
 */

Mongoose.prototype.DocumentProvider = require('./document_provider');

/**
 * The [MongooseError](#error_MongooseError) constructor.
 *
 * @method Error
 * @api public
 */

Mongoose.prototype.Error = require('./error');

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

var mongoose = module.exports = exports = new Mongoose;
