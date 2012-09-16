
/*!
 * Module dependencies.
 */

var Schema = require('./schema')
  , SchemaType = require('./schematype')
  , VirtualType = require('./virtualtype')
  , SchemaTypes = Schema.Types
  , SchemaDefaults = require('./schemadefault')
  , Types = require('./types')
  , Query = require('./query')
  , Promise = require('./promise')
  , Model = require('./model')
  , Document = require('./document')
  , utils = require('./utils')
  , format = utils.toCollectionName
  , mongodb = require('mongodb')

/**
 * Mongoose constructor.
 *
 * The exports object of the `mongoose` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * @api public
 */

function Mongoose () {
  this.connections = [];
  this.plugins = [];
  this.models = {};
  this.modelSchemas = {};
  this.options = {};
  this.createConnection(); // default connection
};

/**
 * Sets mongoose options
 *
 * ####Example:
 *
 *     mongoose.set('test', value) // sets the 'test' option to `value`
 *
 * @param {String} key
 * @param {String} value
 * @api public
 */

Mongoose.prototype.set = function (key, value) {
  if (arguments.length == 1)
    return this.options[key];
  this.options[key] = value;
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

/*!
 * ReplSet connection string check.
 */

var rgxReplSet = /^.+,.+$/;

/**
 * Creates a Connection instance.
 *
 * ####Example:
 *
 *     // with mongodb:// URI
 *     db = mongoose.createConnection('mongodb://localhost:port/database');
 *
 *     // replica sets
 *     db = mongoose.createConnection('mongodb://localhost:port/database,mongodb://anotherhost:port,mongodb://yetanother:port');
 *
 *     // with [host, database_name[, port] signature
 *     db = mongoose.createConnection('localhost', 'database', port)
 *
 *     // initialize now, connect later
 *     db = mongoose.createConnection();
 *     db.open('localhost', 'database', port);
 *
 * @param {String} [uri] a mongodb:// URI
 * @return {Connection} the created Connection object
 * @api public
 */

Mongoose.prototype.createConnection = function () {
  var conn = new Connection(this);
  this.connections.push(conn);

  if (arguments.length) {
    if (rgxReplSet.test(arguments[0])) {
      conn.openSet.apply(conn, arguments);
    } else {
      conn.open.apply(conn, arguments);
    }
  }

  return conn;
};

/**
 * Opens the default mongoose connection.
 *
 * If arguments are passed, they are proxied to either [Connection#open](#connection_Connection-open) or [Connection#openSet](#connection_Connection-openSet) appropriately.
 *
 * @see Mongoose#createConnection
 * @api public
 * @return {Mongoose} this
 */

Mongoose.prototype.connect = function () {
  var conn = this.connection;

  if (rgxReplSet.test(arguments[0])) {
    conn.openSet.apply(conn, arguments);
  } else {
    conn.open.apply(conn, arguments);
  }

  return this;
};

/**
 * Disconnects all connections.
 *
 * @param {Function} [fn] called after all connection close.
 * @return {Mongoose} this
 * @api public
 */

Mongoose.prototype.disconnect = function (fn) {
  var count = this.connections.length
    , error

  this.connections.forEach(function(conn){
    conn.close(function(err){
      if (error) return;

      if (err) {
        error = err;
        if (fn) return fn(err);
        throw err;
      }

      if (fn)
        --count || fn();
    });
  });
  return this;
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
 * When no `collection` argument is passed, Mongoose produces a collection name by passing the model `name` to the [utils.toCollectionName](#utils.toCollectionName) method. This method pluralizes the name. Collection names can also be declared through schema options.
 *
 * ####Example:
 *
 *     var schema = new Schema({ name: String });
 *     schema.set('collection', 'actor');
 *
 * @param {String} name model name
 * @param {Schema} [schema]
 * @param {String} [collection] name (optional, induced from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @api public
 */

Mongoose.prototype.model = function (name, schema, collection, skipInit) {
  // normalize collection
  if (!(schema instanceof Schema)) {
    collection = schema;
    schema = false;
  }

  if ('boolean' === typeof collection) {
    skipInit = collection;
    collection = null;
  }

  // look up models for the collection
  if (!this.modelSchemas[name]) {
    if (!schema && name in SchemaDefaults) {
      schema = SchemaDefaults[name];
    }

    if (schema) {
      this.modelSchemas[name] = schema;
      for (var i = 0, l = this.plugins.length; i < l; i++) {
        schema.plugin(this.plugins[i][0], this.plugins[i][1]);
      }
    } else {
      throw new Error('Schema hasn\'t been registered for model "' + name + '".\n'
                    + 'Use mongoose.model(name, schema)');
    }
  }

  if (!this.models[name]) {
    schema || (schema = this.modelSchemas[name]);
    collection || (collection = schema.set('collection') || format(name));

    var model = Model.compile(name
                        , this.modelSchemas[name]
                        , collection
                        , this.connection
                        , this);

    if (!skipInit) model.init();

    this.models[name] = model;
  }

  return this.models[name];
};

/**
 * Declares a global plugin executed on all Schemas.
 *
 * Equivalent to calling `.plugin(fn)` on each Schema you create.
 *
 * @param {Function} fn plugin callback
 * @param {Object} [opts] optional options
 * @return {Mongoose} this
 * @api public
 */

Mongoose.prototype.plugin = function (fn, opts) {
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
 * @property connection
 * @return {Connection}
 * @api public
 */

Mongoose.prototype.__defineGetter__('connection', function(){
  return this.connections[0];
});

/*!
 * Driver depentend APIs
 */

var driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';

/*!
 * Connection
 */

var Connection = require(driver + '/connection');

/*!
 * Collection
 */

var Collection = require(driver + '/collection');

/**
 * The exports object is an instance of Mongoose.
 *
 * @api public
 */

module.exports = exports = new Mongoose;
var mongoose = module.exports;

/**
 * The Mongoose Collection constructor
 *
 * @api public
 */

mongoose.Collection = Collection;

/**
 * The Mongoose Connection constructor
 *
 * @api public
 */

mongoose.Connection = Connection;

/**
 * Mongoose version
 *
 * @api public
 */

mongoose.version = JSON.parse(
  require('fs').readFileSync(__dirname + '/../package.json', 'utf8')
).version;

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
 * @api public
 */

mongoose.Mongoose = Mongoose;

/**
 * The Mongoose Schema constructor
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var Schema = mongoose.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @api public
 */

mongoose.Schema = Schema;

/**
 * The Mongoose SchemaType constructor.
 *
 * @api public
 */

mongoose.SchemaType = SchemaType;

/**
 * The various Mongoose SchemaTypes.
 *
 * ####Note:
 *
 * _Alias of mongoose.Schema.Types for backwards compatibility._
 *
 * @see Schema.SchemaTypes #schema_Schema-Types
 * @api public
 */

mongoose.SchemaTypes = Schema.Types;

/**
 * The Mongoose VirtualType constructor.
 *
 * @api public
 */

mongoose.VirtualType = VirtualType;

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
 * - Array
 * - Buffer
 * - Document
 * - Embedded
 * - DocumentArray
 * - ObjectId
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = mongoose.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @api public
 */

mongoose.Types = Types;

/**
 * The Mongoose Query constructor.
 *
 * @api public
 */

mongoose.Query = Query;

/**
 * The Mongoose Promise constructor.
 *
 * @api public
 */

mongoose.Promise = Promise;

/**
 * The Mongoose Model constructor.
 *
 * @api public
 */

mongoose.Model = Model;

/**
 * The Mongoose Document constructor.
 *
 * @api public
 */

mongoose.Document = Document;

/**
 * The MongooseError constructor.
 *
 * @api public
 */

mongoose.Error = require('./error');

/**
 * The node-mongodb-native driver Mongoose uses.
 *
 * @api public
 */

mongoose.mongo = require('mongodb');
