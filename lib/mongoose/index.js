
/**
 * Module dependencies.
 */

var Schema = require('./schema')
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
 * Defines a model
 *
 * @param {String} model name
 * @param {String} collection name (optional, induced from model name)
 * @return {Schema} schema definer
 */

Mongoose.prototype.model = function (name, schema, collection) {
  return new Model();
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
 * Export default singleton.
 * 
 * @api public
 */

module.exports = new Mongoose();

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
 * ObjectID
 *
 * @api public
 */

var ObjectId = exports.ObjectId = require(driver + '/objectid');

/**
 * Export Mongoose constructor
 *
 * @api public
 */

exports.Mongoose = Mongoose;
