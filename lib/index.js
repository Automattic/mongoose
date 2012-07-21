
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
  , format = utils.toCollectionName;

/**
 * Mongoose constructor.
 *
 * Most apps will only use one instance.
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
 * Sets/gets mongoose options
 *
 * Examples:
 *
 *    mongoose.set('test') // returns the 'test' value
 *    mongoose.set('test', value) // sets the 'test' value
 *
 * @param {String} key
 * @param {String} value
 * @api public
 */

Mongoose.prototype.set =
Mongoose.prototype.get = function (key, value) {
  if (arguments.length == 1)
    return this.options[key];
  this.options[key] = value;
  return this;
};

/*!
 * ReplSet connection string check.
 */

var rgxReplSet = /^.+,.+$/;

/**
 * Creates a Connection instance.
 *
 * Examples:
 *
 *    // with mongodb:// URI
 *    db = mongoose.createConnection('mongodb://localhost:port/database');
 *
 *    // with [host, database_name[, port] signature
 *    db = mongoose.createConnection('localhost', 'database', port)
 *
 *    // initialize now, connect later
 *    db = mongoose.createConnection();
 *    db.open('localhost', 'database', port);
 *
 * @param {String} mongodb:// URI
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
 * Connects the default mongoose connection
 *
 * @see {Mongoose#createConnection}
 * @api public
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
 * Disconnects from all connections.
 *
 * @param {Function} fn optional callback
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
 * Defines a model or retrieves it
 *
 * @param {String} name model name
 * @param {Schema} schema
 * @param {String} collection name (optional, induced from model name)
 * @param {Boolean} skipInit whether to skip initialization (defaults to false)
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
 * Declares a plugin executed on Schemas.
 *
 * Equivalent to calling `.plugin(fn)` on each Schema you create.
 *
 * @param {Function} fn plugin callback
 * @param {Object} [opts] optional options
 * @api public
 */

Mongoose.prototype.plugin = function (fn, opts) {
  this.plugins.push([fn, opts]);
  return this;
};

/**
 * Default connection
 *
 * @property connection
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
 * Export default Mongoose singleton.
 *
 * @api public
 */

module.exports = exports = new Mongoose;

/**
 * Expose Collection
 *
 * @api public
 */

exports.Collection = Collection;

/**
 * Expose Connection
 *
 * @api public
 */

exports.Connection = Connection;

/**
 * Expose Mongoose version
 *
 * @api public
 */

exports.version = JSON.parse(
  require('fs').readFileSync(__dirname + '/../package.json', 'utf8')
).version;

/**
 * Expose Mongoose constructor
 *
 * @api public
 */

exports.Mongoose = Mongoose;

/**
 * Expose Schema constructor
 *
 * @api public
 */

exports.Schema = Schema;

/**
 * Expose SchemaType constructor.
 *
 * @api public
 */

exports.SchemaType = SchemaType;

/**
 * Expose VirtualType constructor.
 *
 * @api public
 */

exports.VirtualType = VirtualType;

/**
 * Expose types
 *
 * @api public
 */

exports.Types = Types;

/**
 * Expose Query
 *
 * @api public
 */

exports.Query = Query;

/**
 * Expose Promise
 *
 * @api public
 */

exports.Promise = Promise;

/**
 * Expose Model constructor
 *
 * @api public
 */

exports.Model = Model;

/**
 * Expose Document constructor
 *
 * @api public
 */

exports.Document = Document;

/**
 * Expose MongooseError
 *
 * @api public
 */

exports.Error = require('./error');

/**
 * Expose the driver.
 *
 * @api public
 */

exports.mongo = require('mongodb');
