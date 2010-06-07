var url = require('url'),
    mongo = require('mongodb/index'),
    Model = require('model').Model,
    EventEmitter = require('events').EventEmitter,
    InsertCommand = require('./commands/insert_command').InsertCommand,

Connection = this.Connection = Class({
  
  include: [EventEmitter.prototype],
  
  init: function(base, uri, options){
    var self = this;
    this.base = base;
    this.name = uri.pathname.replace('/', '');
    this.uri = uri;
    this._compiled = {};
    this._collections = {};
    EventEmitter.call(this);
    this._open();
  },
  
  _open: function(){
    var self = this;
    this.db = new mongo.Db(this.name, new mongo.Server(uri.hostname, uri.port, options));
    this.db.open(function(err){
      if (err) return self._error("Can't connect to " + url.format(uri));
      for (var i in self._collections) self._collections[i].db = self.db;
    });
  },
  
  model: function(model){
    if (name in this._compiled) return this._compiled[name];
    return this._compile(model);
  },
  
  collection: function(name){
    if (!(name in this._collections)) this._collections[name] = new Connection.Collection(this, name);
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

for (var i in Collection.prototype){
  if (!(i in Connection.Collection.prototype)){
    Connection.Collection.prototype[i] = function(){
      return this._queue(i, arguments);
    };
  }
}

MockCollection = Class({
  
  find: function(query, options, callback){
    callback({}, []); // will yield no results
  },
  
  save: function(doc, callback){
    callback();
  }
  
});

MockConnection = Connection.extend({
  
  _open: function(){
    this._collection = new MockCollection();
  }
  
});