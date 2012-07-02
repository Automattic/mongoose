
/**
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
  , utils = require('./utils');

/**
 * Mongoose constructor. Most apps will only use one instance.
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
  if (arguments.length)
    conn.open.apply(conn, arguments);
  return conn;
};

/**
 * Creates a replica set connection
 *
 * @see {Mongoose#createConnection}
 * @api public
 * @deprecated
 */

function createSetConnection () {
  var conn = new Connection(this);
  this.connections.push(conn);
  if (arguments.length)
    conn.openSet.apply(conn, arguments);
  return conn;
};

Mongoose.prototype.createSetConnection =
  utils.dep('Mongoose#createSetConnection'
          , 'Mongoose#createConnection in v3'
          , createSetConnection);

/**
 * Connects the default mongoose connection
 *
 * @see {Mongoose#createConnection}
 * @api public
 */

Mongoose.prototype.connect = function (){
  this.connection.open.apply(this.connection, arguments);
  return this;
};

/**
 * Connects the default mongoose connection to a replica set
 *
 * @see {Mongoose#createSetConnection}
 * @api public
 * @deprecated
 */

function connectSet () {
  this.connection.openSet.apply(this.connection, arguments);
  return this;
};
Mongoose.prototype.connectSet =
  utils.dep('Mongoose#connectSet', 'Mongoose#connect in v3', connectSet);

/**
 * Disconnects from all connections.
 *
 * @param {Function} optional callback
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
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name (optional, induced from model name)
 * @param {Boolean} whether to skip initialization (defaults to false)
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

  if (!schema) {
    schema = this.modelSchemas[name];
  }

  if (!collection) {
    collection = schema.set('collection') || utils.toCollectionName(name);
  }

  if (!this.models[name]) {
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
 * Declares a plugin executed on Schemas. Equivalent to calling `.plugin(fn)`
 * on each Schema you create.
 *
 * @param {Function} plugin callback
 * @api public
 */

Mongoose.prototype.plugin = function (fn, opts) {
  this.plugins.push([fn, opts]);
  return this;
};

/**
 * Default connection
 *
 * @api public
 */

Mongoose.prototype.__defineGetter__('connection', function(){
  return this.connections[0];
});

/**
 * Driver depentend APIs
 */

var driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native';

/**
 * Connection
 *
 * @api public
 */

var Connection = require(driver + '/connection');

/**
 * Collection
 *
 * @api public
 */

var Collection = require(driver + '/collection');

/**
 * Export default singleton.
 *
 * @api public
 */

module.exports = exports = new Mongoose();

/**
 * Collection
 *
 * @api public
 */

exports.Collection = Collection;

/**
 * Connection
 *
 * @api public
 */

exports.Connection = Connection;

/**
 * Exports Mongoose version
 *
 * @param version
 */

exports.version = JSON.parse(
  require('fs').readFileSync(__dirname + '/../package.json', 'utf8')
).version;

/**
 * Export Mongoose constructor
 *
 * @api public
 */

exports.Mongoose = Mongoose;

/**
 * Export Schema constructor
 *
 * @api public
 */

exports.Schema = Schema;

/**
 * Export SchemaType constructor.
 *
 * @api public
 */

exports.SchemaType = SchemaType;

/**
 * Export VirtualType constructor.
 *
 * @api public
 */

exports.VirtualType = VirtualType;

/**
 * Export Schema types
 *
 * @api public
 */

exports.SchemaTypes = SchemaTypes;

/**
 * Export types
 *
 * @api public
 */

exports.Types = Types;

/**
 * Export Query
 *
 * @api public
 */

exports.Query = Query;

/**
 * Export Promise
 *
 * @api public
 */

exports.Promise = Promise;

/**
 * Export Model constructor
 *
 * @api public
 */

exports.Model = Model;

/**
 * Export Document constructor
 *
 * @api public
 */

exports.Document = Document;

/**
 * Export MongooseError
 *
 * @api public
 */

exports.Error = require('./error');

exports.mongo = require('mongodb');
