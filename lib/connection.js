var url = require('url'),
    mongo = require('mongodb/index'),
    Model = require('./model').Model,
    EventEmitter = require('events').EventEmitter,

Connection = this.Connection = Class({
  
  include: [EventEmitter.prototype],
  
  init: function(base, uri, options){
    var self = this;
    this.base = base;
    if (!uri.pathname) throw new Error('Please provide a database name');
    this.name = uri.pathname.replace('/', '');
    this.uri = uri;
    this._compiled = {};
    this._collections = {};
    EventEmitter.call(this);
    this._open(options);
  },
  
  _open: function(options){
    var self = this;
    this.db = new mongo.Db(this.name, new mongo.Server(this.uri.hostname, this.uri.port, options));
    this.db.open(function(err){
      if (err) return self._error("Can't connect to " + url.format(uri));
      for (var i in self._collections) self._collections[i].db = self.db;
    });
  },
  
  model: function(name){
    if (name in this._compiled) return this._compiled[name];
    return this._compile(name);
  },
  
  collection: function(name){
    if (!(name in this._collections)) this._collections[name] = new Connection.Collection(this, name);
    if (this.db) this._collections[name].db = this.db;
    return this._collections[name];
  },
  
  _error: function(err){
    this.emit('error', err);
    return this;
  },
  
  _compile: function(model){
    var _compiled = Model.compile(model, this.base.model(model), this);
    this._compiled[model] = _compiled;
    return _compiled;
  }
  
});

Connection.Collection = Class({
  
  init: function(base, name){
    this.base = base;
    this.name = name;
    this._queued = [];
  },
  
  set db(db){
    var self = this;
    db.collection(this.name, function(err, collection){
      if (err) return self.base.emit('error', err);
      self.collection = collection;
    });
  },
  
  set collection(c){
    self._collection = c;
    this._process();
  },
  
  _queue: function(method, args){
    if (this._collection) return this._collection[method].apply(this._collection, args);
    this._queued.push([method, args]);
  },
  
  _process: function(){
    this._queued.forEach(function(m){
      this._collection[m[0]].apply(this._collection, m[1]);
    }, this);
  }
  
});

for (var i in require('mongodb/collection').Collection.prototype){
  if (!(i in Connection.Collection.prototype)){
    Connection.Collection.prototype[i] = function(){
      return this._queue(i, arguments);
    };
  }
}