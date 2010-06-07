var url = require('url'),
    mongo = require('mongodb/index'),
    Model = require('model').Model,
    Collection = require('mongodb/collection').Collection,
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
    this._queued = [];
    EventEmitter.call(this);
    this._open();
  },
  
  _open: function(){
    this.db = new mongo.Db(this.name, new mongo.Server(uri.hostname, uri.port, options));
    this.db.open(function(err){
      if (err) return self._error("Can't connect to " + url.format(uri));
      self.db.collection(function(err, collection){
        if (err) return self._error(err);
        self._collection = collection;
      });
    });
  },
  
  model: function(model){
    if (name in this._compiled) return this._compiled[name];
    return this._compile(model);
  },
  
  _error: function(err){
    this.emit('error', err);
    return this;
  },
  
  _compile: function(model){
    var _compiled = Model.compile(this.base.model(model), this);
    this._compiled[model] = _compiled;
    return _compiled;
  },
  
  _queue: function(method, args){
    if (this._collection) return this._collection[method].apply(this._collection, args);
    this._queued.push([method, args]);
  },
  
  _process: function(){
    if (this._queued.length){
      this._queued.forEach(function(m){
        this._collection[m[0]].apply(this._collection, m[1]);
      }, this);
    }
  },
  
  set _collection(collection){
    this._collection = collection;
    this._process();
  }
  
});

for (var i in Collection.prototype){
  if (!(i in Connection.prototype)){
    Connection.prototype[i] = function(){
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