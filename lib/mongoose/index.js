var url = require('url'),
    sys = require('sys'),
    mongo = require('../../support/node-mongodb-native/lib/mongodb'),
    EventEmitter = require('events').EventEmitter,
    Schema = require('./schema'),
    TypeDefinition = require('./type').TypeDefinition;

var Mongoose = module.exports = {
  
  _connections: [],
  
  _models: {},
  
  _types: {},
  
  connect: function(uri, options, callback){
    var conn = new Connection(uri, options, callback);
    this._connections.push(conn);
    return conn;
  },
  
  disconnect: function(callback){
    var i = 0, length = this._connections.length;
    this._connections.forEach(function(c, i){
      c.close(function(err){
        if (err) return callback(err);
        if (++i == length){
          self._connections = [];
          callback(null);
        } 
      });
    });
  },
  
  define: function(name){
    var schema = new Schema();
    if (typeof name == 'string'){
      this._models[name] = schema;
      this.__defineGetter__(name, function(){
        if (this.connection){
          return this.connection.model(name);
        }
        return null;
      });
    }
    return schema;
  },
  
  type: function(name){
    if(name && this._types[name]) return this._types[name];
    else return this._types[name] = new TypeDefinition(name);
  }
  
};

sys.inherits(Mongoose, EventEmitter);

Mongoose.__defineGetter__('connection', function(){
  return this._connections[0];
});


Mongoose.__defineGetter__('connected', function(){
  return this.connection && this.connection.open;
});

var Connection = this.Connection = function(uri, callback){
  var _uri = url.parse(uri),
      options = typeof callback !== 'function' ? callback : {},
      callback = typeof callback == 'function' ? callback : arguments[2],
      self = this;
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
    if (err) return callback(err);
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
  return this._compile(name);
};

Connection.prototype.close = function(){
  if (this.open){
    var self = this;
    this.db.close(function(){
      self.open = false;
      self.emit('disconnect');
    });
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