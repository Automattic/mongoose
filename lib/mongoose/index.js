var url = require('url')
  , sys = require('sys')
  , mongo = require('../../support/node-mongodb-native/lib/mongodb')
  , EventEmitter = require('events').EventEmitter
  , Schema = require('./schema')
  , Doc = require('./document')
  , Documentation = require('./documentation')
  , Query = require('./query');

var Mongoose = function(){
  this._connections = [];
  this._models = {};
  this._types = {};
  this.define = this.define.bind(this); // TODO Why bind?
  this.type = this.type.bind(this);     // TODO Why bind?
};

sys.inherits(Mongoose, EventEmitter);

Mongoose.prototype.connect = function(uri, options, callback){
  var conn = new Connection(uri, options, callback);
  this._connections.push(conn);
  return conn;
};

Mongoose.prototype.disconnect = function(callback){
  var i = 0
    , self = this
    , length = this._connections.length;
  this._connections.forEach(function(c, i){
    c.disconnect = true;
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
 * When only `name` is given and the type exists, return it,
 * otherwise a new `TypeSchema` is created and returned for modification.
 * 
 * You may also specify an `alias` for your type, for example "boolean" is
 * aliased as "bool".
 *
 * @param {String} name
 * @param {String} alias
 * @return {TypeSchema}
 * @api public
 */

Mongoose.prototype.type = function(name, alias){
  if(name && this._types[name]) return this._types[name];
  else {
    var mongoose = this;
    // Exposes a shortcut factory method for declaring type instances
    // from the document definition chain
    /**
     * @param {String} key is the name of the attribute
     * @param {Object|Schema} subtype
     * @return {Schema} this
     */
    Schema.prototype[name] = Schema.prototype[alias || name] = function (key, subtype){
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
      } else {
        if(name == 'array' && (typeof subtype == 'string' || subtype != undefined)) this.extend(subtype);
        this._struct.push(key);
      }
      var setups = this.paths[key].setups, i, l;
      for(i=0, l = setups.length; i<l; i++) setups[i].apply(this,[key, path]);
      return this;
    };
    return this._types[name] = new TypeSchema(name);
//    return this._types[name] = new type(name);
  }
};

/**
 * Generate documentation with the given `options`.
 *
 * Options:
 *
 *    - `models`    an array of model names, defaults to all models
 *    - `dest`      destination output directory defaulting to the __CWD__
 *
 * @param {Object} options
 * @api public
 */

Mongoose.prototype.documentation = function(options){
  var self = this;
  options = options || {};
  if (options.models) {
    options.models = options.models.reduce(function(obj, name){
      obj[name] = self._models[name];
      return obj;
    }, {});
  } else {
    options.models = this._models;
  }
  new Documentation(options).generate();
};

Mongoose.prototype.__defineGetter__('connection', function(){
  return this._connections[0];
});


Mongoose.prototype.__defineGetter__('connected', function(){
  return this.connection && this.connection.open;
});

exports = module.exports = new Mongoose();
exports.Document = require('./document').Document;
exports.Schema = require('./schema');
exports.TypeSchema = require('./type');
exports.util = require('./util');
exports.ObjectID = mongo.ObjectID;

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
    if(self.disconnect) self.close(callback || function(){});
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
  if(this.disconnect) return;
  this.open = true;
  for (var i in this._collections) this._collections[i]._setDb(this._db);
  this.emit('connect');
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
 * 1. Creates a new constructor (model) that inherits from Schema._models[name]._model
 *    which itself inherits from Doc.Document
 * 2. Assigns this as the new model's connection
 * 3. Assigns 
 * @param {String} name is the name of the model
 * @return {Function} an new model constructor (inheritance is model < schema._model < Doc.Document)
 */
Connection.prototype._compile = function(name){
  var schema = module.exports._models[name], prop, 
      model = function(){
        schema._model.apply(this, arguments);
      };
  sys.inherits(model, schema._model);
  model._connection = this;
  model._collection = this.collection(schema._collection);
  Doc.defineMethod(model, '_connection', this);
  Doc.defineMethod(model, '_collection', model._collection);

  model.Query = schema.Query;
  var queryKeys = Object.keys(Query.prototype);
  for(prop in schema._hooks) Doc.defineHook(model, prop, schema._hooks[prop]);
  for(prop in schema._methods) Doc.defineMethod(model, prop, schema._methods[prop]);
  for(prop in schema._statics) {
    model[prop] = schema._statics[prop];
    if (!~queryKeys.indexOf(prop)) {
      model.Query.prototype[prop] = schema._statics[prop];
    }
  }
  for(prop in schema._staticGetters) {
    model.__defineGetter__(prop, schema._staticGetters[prop]);
    model.Query.prototype.__defineGetter__(prop, schema._staticGetters[prop]);
  }
  for(prop in schema._staticSetters) {
    model.__defineSetter__(prop, schema._staticSetters[prop]);
    model.Query.prototype.__defineSetter__(prop, schema._staticSetters[prop]);
  }

  Doc.compileEtters(schema._struct, model.prototype);
  for(embedded in schema._embedded){
    schema._embedded[embedded] = this._compileEmbedded(schema._embedded[embedded]);
  }
  return model;
};

Connection.prototype._compileEmbedded = function(schema){
    var model = function(){
      Doc.Document.apply(this, arguments);
    };
    sys.inherits(model, Doc.Document);
    Doc.defineMethod(model, '_schema',  schema);
    Doc.defineMethod(model, '_getters', {});
    for(prop in schema._hooks) Doc.defineHook(model, prop, schema._hooks[prop]);
    Doc.compileEtters(schema._struct, model.prototype);
    return model;
};

Connection.prototype.close = function(callback){
  if (this.open || this.disconnect) {
    var self = this;
    this._db.close(function (err) {
      if (err) return callback ? callback(err) : null;
      self.open = false;
      if (callback) callback(null);
      self.emit('close');
    });
    // temporary, until -native close() fires a callback
    this.open = false;
    if (callback) callback(null);
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

for (var i in require('../../support/node-mongodb-native/lib/mongodb/collection').Collection.prototype){
  (function(name){
    if (!(name in Collection.prototype)){
      Collection.prototype[name] = function(){
        return this._queue(name, arguments);
      };
    }
  })(i);
}
