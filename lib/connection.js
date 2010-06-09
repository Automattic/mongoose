var url = require('url'),
    mongo = require('mongodb/index'),
    Model = require('./model').Model,
    EventEmitter = require('events').EventEmitter,
    Class = require('./util').Class,

Connection = this.Connection = Class({
  
  include: [EventEmitter.prototype],
  
  init: function(base, uri, options){
    var self = this;
    this.base = base;
    this.uri = uri;
    this.name = this.uri.pathname;
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
      if (self._close) return self.db.close();
      self._connected = true;
      for (var i in self._collections) self._collections[i].setDb(self.db);
      self.emit('open');
    });
  },
  
  model: function(name){
    if (name in this._compiled) return this._compiled[name];
    return this._compile(name);
  },
  
  collection: function(name){
    if (!(name in this._collections)) this._collections[name] = new Collection(this, name);
    if (this._connected) this._collections[name].setDb(this.db);
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
  },
  
  close: function(){
    if (this._connected){
      var self = this;
      this.db.close(function(){
        self._connected = false;
        self.emit('close');
      });
    } else {
      this._close = true;
    }
    return this;
  }
  
}),

Collection = this.Collection = Class({
  
  init: function(base, name){
    this.base = base;
    this.name = name;
    this._queued = [];
  },
  
  setDb: function(db){
    var self = this;
    db.collection(this.name, function(err, collection){
      if (err) return self.base.emit('error', err);
      self.setCollection(collection);
    });
  },
  
  setCollection: function(c){
    this._collection = c;
    this._process();
  },
  
  _queue: function(method, args){
    if (this._collection) return this._collection[method].apply(this._collection, args);
    this._queued.push([method, args]);
  },
  
  _process: function(){
    var a;
    while (a = this._queued.shift()) this._collection[a[0]].apply(this._collection, a[1]);
    return this;
  }
  
});

for (var i in require('mongodb/collection').Collection.prototype){
  (function(name){
    if (!(name in Collection.prototype)){
      Collection.prototype[name] = function(){
        return this._queue(name, arguments);
      };
    }
  })(i);
}