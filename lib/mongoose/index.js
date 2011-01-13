
/**
 * Module dependencies.
 */

var Schema = require('./schema')
  , SchemaType = require('./schematype')
  , SchemaTypes = Schema.Types
  , Types = require('./types')
  , Model = require('./model')
  , utils = require('./utils');

/**
 * Mongoose constructor. Most apps will only use one instance.
 *
 * @api public
 */

function Mongoose () {
  this.connections = [];
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
 * Disconnects from all connections.
 *
 * @param {Function} optional callback
 * @api public
 */

Mongoose.prototype.disconnect = function (fn) {
  var count = this.connections.length;
  if (count)
    this.connections.forEach(function(conn){
      conn.close(function(err){
        if (err) return fn(err);
        --count || fn();
      });
    });
  else
    fn();
  return this;
};

/**
 * Defines a model or retrieves it
 *
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name (optional, induced from model name)
 * @api public
 */

Mongoose.prototype.model = function (name, schema, collection) {
  // normalize collection
  if (!(schema instanceof Schema)){
    collection = schema;
    schema = false;
  }

  collection = collection || utils.toCollectionName(name);
  
  // look up models for the collection
  if (schema)
    this.modelSchemas[name] = schema;
  else {
    if (!this.modelSchemas[name])
      throw new Error('Schema hasn\'t been registered for model "' + name + '".\n'
                    + 'Use Mongoose.define(name, schema)');

    var conn = this.connection;

    if (!this.models[collection])
      this.models[collection] = {};

    if (!this.models[collection][name])
      this.models[collection][name] = Model.compile(name
                                                  , this.modelSchemas[name]
                                                  , collection
                                                  , conn);

    return this.models[collection][name];
  }
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
 * Compat flag.
 *
 * @api public
 */

var compat = false;

exports.__defineGetter__('compat', function(){
  return compat;
});

exports.__defineSetter__('compat', function(v){
  compat = v;
  if (v) require('./compat');
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

var Connection = exports.Connection = require(driver + '/connection');

/**
 * Collection
 *
 * @api public
 */

var Collection = exports.Collection = require(driver + '/collection');

/**
 * Export default singleton.
 * 
 * @api public
 */

module.exports = exports = new Mongoose();

/**
 * Exports Mongoose version
 *
 * @param version
 */

exports.version = '1.0.0';

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
