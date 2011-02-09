
/**
 * Module dependencies.
 */

var url = require('url')
  , utils = require('./utils')
  , EventEmitter = utils.EventEmitter
  , driver = global.MONGOOSE_DRIVER_PATH || './drivers/node-mongodb-native'
  , Model = require('./model')
  , Collection  = require(driver + '/collection');

/**
 * Connection constructor. For practical reasons, a Connection equals a Db
 *
 * @param {Mongoose} mongoose base
 * @api public
 */

function Connection (base) {
  this.base = base;
  this.collections = {};
  this.models = {};
};

/**
 * Inherit from EventEmitter.
 *
 */

Connection.prototype.__proto__ = EventEmitter.prototype;

/**
 * Connection ready state:
 *  0 = Disconnected
 *  1 = Connected
 *  2 = Connecting
 *  3 = Disconnecting
 *
 * @api public
 */

Connection.prototype.readyState = 0;

/**
 * A hash of the collections associated with this connection
 *
 * @param text
 */

Connection.prototype.collections;

/**
 * The mongodb.Db instance, set when the connection is opened
 *
 * @api public
 */

Connection.prototype.db;

/**
 * Establishes the connection
 *
 * @param {String} mongodb://uri
 * @return {Connection} self
 * @api public
 */

Connection.prototype.open = function (host, database, port, callback) {
  var self = this
    , uri;

  // if we've been supplied an uri
  if (typeof database != 'string'){
    uri = url.parse(host);
    host = uri.hostname;
    port = uri.port || 27017;
    callback = database;
    database = uri.pathname.replace(/\//g, '');
  } else {
    callback = callback || port;
    port = typeof port == 'number' ? port : 27017;
  }
  
  // make sure we can open
  if (this.readyState != 0){
    if ('function' == typeof callback)
      callback(new Error('Trying to open unclosed connection'));
    return this;
  }

  // handle authentication
  if (uri && uri.auth){
    var auth = uri.auth.split(':');
    this.user = auth[0];
    this.pass = auth[1];
  } else 
    this.user = this.pass = undefined;
  
  if (!host) {
    if ('function' == typeof callback)
      callback(new Error('Please provide a valid hostname.'));
    return this;
  }

  if (!database) {
    if ('function' == typeof callback)
      callback(new Error('Please provide a database to connect to.'));
    return this;
  }

  this.name = database;
  this.host = host;
  this.port = port;

  // signal connecting
  this.readyState = 2;
  this.emit('opening');

  // open connection
  this.doOpen(function(err){
    if (err) {
      if (typeof callback == 'function') callback(err);
    } else {
      self.onOpen();
      if (typeof callback == 'function') callback(null);
    }
  });

  return this;
};

/**
 * Called when the connection is opened
 *
 * @api private
 */

Connection.prototype.onOpen = function () {
  var self = this;
  
  var continuation = function(){
   self.readyState = 1;
   // avoid having the collection subscribe to our event emitter
   // to prevent 0.3 warning
   for (var i in self.collections)
     self.collections[i].onOpen();
     
   self.emit('open');
  };
  
  //do authentication before we continue if a database username and password exist
  if(self.user && self.pass)
    self.db.authenticate(self.user,self.pass,continuation);
  else 
    continuation();
};

/**
 * Closes the connection
 *
 * @param {Function} optional callback
 * @return {Connection} self
 * @api public
 */

Connection.prototype.close = function (callback) {
  var self = this;

  switch (this.readyState){
    case 0: // disconnected
      callback(null);
      break;

    case 1: // connected 
      this.readyState = 3;
      this.doClose(function(err){
        if (err){
          if (callback) callback(err);
        } else {
          self.onClose();
          if (callback) callback(null);
        }
      });
      break;

    case 2: // connecting
      this.once('open', function(){
        self.close(callback);
      });
      break;

    case 3: // disconnecting
      this.once('close', function () {
        callback(null);
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

Connection.prototype.onClose = function () {
  this.readyState = 0;
  
  // avoid having the collection subscribe to our event emitter
  // to prevent 0.3 warning
  for (var i in this.collections)
    this.collections[i].onClose();

  this.emit('close');
};

/**
 * Retrieves a collection, creating it if not cached.
 *
 * @param {String} collection name
 * @return {Collection} collection instance
 * @api public
 */

Connection.prototype.collection = function (name) {
  if (!(name in this.collections))
    this.collections[name] = new Collection(name, this);
  return this.collections[name];
};

/**
 * Defines a model or retrieves it
 *
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name (optional, induced from model name)
 * @api public
 */

Connection.prototype.model = function (name, collection) {
  collection || (collection = utils.toCollectionName(name));
  // look up models for the collection
  if (!this.models[collection])
    this.models[collection] = {};

  if (!this.models[collection][name]){
    var model = this.base.model(name, null, collection, true)
      , Model;
    
    if (model.prototype.connection != this){
      function Model (){
        model.apply(this, arguments);
      };

      Model.__proto__ = model;
      Model.prototype.__proto__ = model.prototype;
      Model.prototype.db = this;
      Model.prototype.collection = this.collection(collection);
      Model.init();
    }

    this.models[collection][name] = Model || model;
  }
  
  return this.models[collection][name];
};

/**
 * Module exports.
 */

module.exports = Connection;
