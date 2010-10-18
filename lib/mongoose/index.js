var url = require('url')
  , sys = require('sys')
  , mongo = require('../../support/node-mongodb-native/lib/mongodb')
  , EventEmitter = require('events').EventEmitter
  , Schema = require('./schema')
  , Doc = require('./document');

var Mongoose = function(){
  this._connections = [];
  this._models = {};
  this._types = {};
  this.define = this.define.bind(this); // TODO Why bind?
  this.type = this.type.bind(this);     // TODO Why bind?
};

sys.inherits(Mongoose, EventEmitter);

/**
 * Initializes a new connection and adds it to the connection pool,
 * this._connections
 * @param {String} uri of the mongodb server (mongodb://...)
 * @param {Object} options is a hash of options
 * @param {Function} callback is the callback function
 * @return {Connection} the created connection
 */
Mongoose.prototype.connect = function(uri, options, callback){
  var conn = new Connection(uri, options, callback);
  this._connections.push(conn);
  return conn;
};

/**
 * Closes each connection in the connection pool, this._connections
 * @param {Function} callback with profile function (err) {...} to be called on any error
 *                   that occurs attempting to close a connection or called after all
 *                   connections have been closed.
 */
Mongoose.prototype.disconnect = function(callback){
  var i = 0
    , self = this
    , length = this._connections.length;
  this._connections.forEach(function(c, i){
    c.close(function(err){
      if (err) return callback ? callback(err) : null;
      if (++i == length){
        self._connections = [];
        if(callback) callback(null);
      } 
    });
  });
};

/**
 * Factory method to define new schemas.
 * 1. Initializes the new Schema
 * 2. Adds a reference to the schema in this._models (to be used later during Connection.prototype._compile)
 * 3. Adds a shortcut getter, name, that delegates to this.connection, which compiles the model (if it hasn't done so already) and returns it.
 * @param {String} name of the schema.
 * @return {Schema} schema that was just initialized
 */
Mongoose.prototype.define = function(name){
  var schema = new Schema(name);
  if (typeof name == 'string'){
    if (name in Mongoose.prototype || name in Connection.prototype){
      throw new Error('Name conflict "'+ name +'". Please choose a different model name.');
    }
    this._models[name] = schema;
    /**
     * Exposes the model to the client.
     * e.g., new mongoose.User({...});
     */
    this.__defineGetter__(name, function(){
      if (this.connection){
        return this.connection.model(name);
      }
      else return null;
    });
  }
  return schema;
};

/**
 * This acts as either:
 * 1. Shortcut method to define new types.
 *    (Factory method to define new TypeSchema instances.)
 * 2. A quick way to retrieve the type (TypeSchema instance) named name
 *
 * When used in the first way:
 *
 * @param {String} name of the type
 * @return {TypeSchema} the type named name
 */
Mongoose.prototype.type = function(name){
  if(name && this._types[name]) return this._types[name];
  else {
    var mongoose = this;
//      , definition = new TypeSchema(name)
//      , type = function(){ 
//          TypeSchema.apply(this, arguments);
//        };
//        type.prototype = definition;
    
    // Exposes a shortcut factory method for declaring type instances
    // from the document definition chain
    /**
     * @param {String} key is the name of the attribute
     * @param {Object|Schema} subtype
     * @return {Schema} this
     */
    Schema.prototype[name] = function (key, subtype){
      var schemaType = function(){
        TypeSchema.apply(this,arguments);
      };
      schemaType.prototype = mongoose._types[name];
      this._addType(key, new schemaType(name, key, subtype, this));
      
      var path = this.getPath([key]);
      if(subtype instanceof Schema){
        if(name == 'array'){
          subtype._host = this;
          this._struct.push(key);
          this._root._embedded[path] = subtype;
        } else {
          subtype._parent = this;
          this._struct.push([key, subtype._struct]);
          for(prop in subtype.paths){
            this.paths[key+'.'+prop] = subtype.paths[prop];
          }
        }
        subtype._pkey = key;
      } else this._struct.push(key);
      
      var setups = this.paths[key].setups, i, l;
      for(i=0, l = setups.length; i<l; i++) setups[i].apply(this,[key, path]);
      return this;
    };
    return this._types[name] = new TypeSchema(name);
//    return this._types[name] = new type(name);
  }
};

Mongoose.prototype.__defineGetter__('connection', function(){
  return this._connections[0];
});


Mongoose.prototype.__defineGetter__('connected', function(){
  return this.connection && this.connection.open;
});

module.exports = new Mongoose();

var TypeSchema = require('./type');
require('./types');

var Connection = this.Connection = function(uri, callback){
  var _uri = url.parse(uri)
    , options = typeof callback !== 'function' ? callback : {}
    , callback = typeof callback == 'function' ? callback : arguments[2]
    , self = this;
  this.name = _uri.pathname.replace(/\//g, '');
  this.host = _uri.hostname;
  this.port = _uri.port || 27017;
  if (_uri.auth){
    var auth = _uri.auth.split(':')[0];
    this.user = auth[0];
    this.pass = auth[1];
  }
  if (_uri.protocol !== 'mongodb:') throw new Error('Please include the mongodb:// protocol');
  if (!this.host) throw new Error('Please provide a hostname')
  if (!this.name) throw new Error('Please provide a database name');
  this._collections = {};
  this._compiled = {}; // Maps the model names to compiled models
  this._db = new mongo.Db(this.name, new mongo.Server(this.host, this.port, options));
  this._db.open(function(err){
    if (err) return callback ? callback(err) : null;
    if(self.user){
      self._db.authenticate(self.user, db.pass, function(){
        self._onOpen();
        if (callback) callback(null);
      });
    } else {
      self._onOpen();
      if (callback) callback(null);
    }
  });
};

sys.inherits(Connection, EventEmitter);

Connection.prototype._onOpen = function(){
  this.open = true;
  for (var i in this._collections) this._collections[i]._setDb(this._db);
  this.emit('open');
};

/**
 * 1. Initializes a new Collection to this connection's dictionary of
 * collections (if it doesn't already exist).
 * 2. Sets the db of the collection to this connection's db (if the connection is open)
 * 3. Returns the collection
 * @param {String} name
 * @return {Collection}
 */
Connection.prototype.collection = function(name){
  if (!(name in this._collections)) this._collections[name] = new Collection(this, name);
  if (this.open) this._collections[name]._setDb(this._db);
  return this._collections[name];
};

/**
 * Either
 * 1. Compiles the model and returns it
 * 2. Returns the compiled model if it is already compiled
 * @param {String} name of the model
 * @return {Function}
 */
Connection.prototype.model = function(name){
  if (name in this._compiled) return this._compiled[name];
  return this._compiled[name] = this._compile(name);
};

/**
 * Compiles the model
 * 1. Creates a new constructor (model) that inherits from the approprite schema's model
 *    -- i.e., mongoose._models[name]._model (mongoose._models[name] is a Schema instance)
 *    which itself inherits from Doc.Document
 * 2. Assigns this as the new model's connection
 * 3. Assigns a collection to the new model.
 * 4. Adds the declared hooks (in mongoose.models[name]._methods) to the model
 * 5. Adds the declared methods (in mongoose.models[name]._hooks) to the model
 * 6. Adds the declared static class methods (in mongoose.models[name]._statics) to the model
 * 7. Compile the getters and setters
 * @param {String} name is the name of the model
 * @return {Function} an new model constructor (inheritance is model < schema._model < Doc.Document)
 */
Connection.prototype._compile = function(name){
  var schema = module.exports._models[name], prop,
      /**
       * This is the model constructor we return
       */ 
      model = function(){
        schema._model.apply(this, arguments);
//        Doc.Document.apply(this, arguments);
      };
  sys.inherits(model, schema._model);
  model._connection = this;
  model._collection = this.collection(schema._collection);
  Doc.defineMethod(model, '_connection', this);
  Doc.defineMethod(model, '_collection', model._collection);
  Doc.defineMethod(model, '_getters', {});

  for(prop in schema._hooks) Doc.defineHook(model, prop, schema._hooks[prop]);
  for(prop in schema._methods) Doc.defineMethod(model, prop, schema._methods[prop]);
  for(prop in schema._statics) model[prop] = schema._statics[prop];
  Doc.compileEtters(schema._struct, model.prototype);
  return model;
};

Connection.prototype.close = function(callback){
  if (this.open) {
    var self = this;
    this._db.close(function (err) {
      if (err) return callback ? callback(err) : null;
      self.open = false;
      if (callback) callback(null);
      self.emit('close');
    });
    // temporary, until -native close() fires a callback
    this.open = false;
    callback(null);
    this.emit('close');
  }
  return this;
};

/**
 * @constructor
 * @param {Connection} base is the connection that this collection is associated with
 * @param {String} name is the name of the collection
 */
var Collection = this.Collection = function(base, name){
  this.base = base;
  this.name = name;
  this._queued = [];
};

Collection.prototype._setDb = function(db){
  var self = this;
  db.collection(this.name, function(err, collection){
    if (err) return self.base.emit('error', err);
    self._setCollection(collection);
  });
};

Collection.prototype._setCollection = function(c){
  this._collection = c;
  this._process();
};

Collection.prototype._queue = function(method, args){
  if (this._collection) return this._collection[method].apply(this._collection, args);
  this._queued.push([method, args]);
};

Collection.prototype._process = function(){
  var a;
  while (a = this._queued.shift()) this._collection[a[0]].apply(this._collection, a[1]);
  return this;
};

// Wrap native mongodb Collection methods, so calling them from our (distinctly non-native mongodb)
// Collection interface either:
// 1. If the collection's db has already been set asynchronously, then invoke the method.
// 2. If the collection's db hasn't yet successfully been set asynchronously, then queues up the
//    methods and calls them as soon as the collection's db has been set.
for (var i in require('../../support/node-mongodb-native/lib/mongodb/collection').Collection.prototype){
  (function(name){
    if (!(name in Collection.prototype)){
      Collection.prototype[name] = function(){
        return this._queue(name, arguments);
      };
    }
  })(i);
}

