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
  this.define = this.define.bind(this);
  this.type = this.type.bind(this);
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
    c.close(function(err){
      if (err) return callback ? callback(err) : null;
      if (++i == length){
        self._connections = [];
        if(callback) callback(null);
      } 
    });
  });
};

Mongoose.prototype.define = function(name){
  var schema = new Schema();
  if (typeof name == 'string'){
    if (name in Mongoose.prototype || name in Connection.prototype){
      throw new Error('Name conflict "'+ name +'". Please choose a different model name.');
    }
    this._models[name] = schema;
    this.__defineGetter__(name, function(){
      if (this.connection){
        return this.connection.model(name);
      }
      else return null;
    });
  }
  return schema;
};

getPath = function(doc,arr){
  var path = arr || [], p = doc;
  while(p._parent){
    path.unshift(p._pkey);
    p = p._parent;
  }
  return path.join('.');
};

Mongoose.prototype.type = function(name){
  if(name && this._types[name]) return this._types[name];
  else {
    var mongoose = this
      , definition = new TypeSchema(name)
      , type = function(){
            TypeSchema.apply(this, arguments);
        };
        type.prototype = definition;
    
    Schema.prototype[name] = function(key, options){
      if(options instanceof Schema){
        if(name == 'array'){
          this._struct.push(key);        
          this._root._embedded[getPath(this,[key])] = options;
        } else {
          this._struct.push([key, options._struct]);
          options._parent = this;
          options._pkey = key;
          for(prop in options.paths){
           this.paths[key+'.'+prop] = options.paths[prop];
          }
        }
      } else {
        if(name == 'virtual') this._virtuals.push(getPath(this,[key]));
        else this._struct.push(key);
      }

      var schemaType = function(){
        TypeSchema.apply(this,arguments);
      };
      schemaType.prototype = mongoose._types[name];

      this._addType(key, new schemaType(name, key, options, this));
      
      var path = getPath(this,[key]);
      this.paths[key].setups.forEach(function(setup){
        setup.apply(this,[key,path]);
      },this);
      return this;
    };  
    return this._types[name] = new type(name);
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
  this._compiled = {};
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
  for (var i in this._collections) this._collections[i].setDb(this.db);
  this.emit('open');
};

Connection.prototype.collection = function(name){
  if (!(name in this._collections)) this._collections[name] = new Collection(this, name);
  if (this._connected) this._collections[name].setDb(this.db);
  return this._collections[name];
};

Connection.prototype.model = function(name){
  if (name in this._compiled) return this._compiled[name];
  return this._compiled[name] = this._compile(name);
};

Connection.prototype._compile = function(name){
  var schema = module.exports._models[name], prop, 
      model = function(obj,flag){
        Doc.Document.call(this,obj,flag);
      };
  sys.inherits(model, Doc.Document);
  model._connection = this;
  model.prototype._connection = this;
  model.prototype._schema = schema;
  for(prop in schema._hooks) Doc.defineMethod(model, prop, schema._hooks[prop]);
  for(prop in schema._methods) model.prototype[prop] = schema._methods[prop];
  for(prop in schema._statics) model[prop] = schema._statics[prop];
  
  return model;
};

Connection.prototype.close = function(callback){
  if (this.open){
    var self = this;
    this._db.close(function(err){
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

var Collection = this.Collection = function(base, name){
  this.base = base;
  this.name = name;
  this._queued = [];
};

Collection.prototype._setDb = function(db){
  var self = this;
  db.collection(this.name, function(err, collection){
    if (!err) return self.base.emit('error', err);
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