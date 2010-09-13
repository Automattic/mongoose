var url = require('url'),
    type = require('type'),
    mongodb = require('../../support/node-mongodb-native/lib/mongodb');

var Mongoose = module.exports = {
  
  connect: function(uri, options){
    if (this._connected) this.disconnect();
    var _uri = url.parse(uri),
        callback = typeof options == 'function' ? options : arguments[2],
        self = this;
    if (_uri.protocol !== 'mongodb:') throw new Error('Please include the mongodb:// protocol');
    if (!_uri.pathname) throw new Error('Please provide a database name');
    this._db = new mongo.Db(_uri.pathname.replace(/\//g, ''), new mongo.Server(_uri.hostname, _uri.port || 27017, options));
    this._db.open(function(err){
      if (err) return callback(err);
      if(_uri.auth){
        var auth = _uri.auth.split(':');
        self._db.authenticate(auth[0], auth[1], function(){
          self._onConnect();
          if (callback) callback();
        });
      } else {
        self._onConnect();
        if (callback) callback();
      }
    });
    return this;
  },
  
  collection: function(name){
    if (!(name in this._collections)) this._collections[name] = new Collection(this, name);
    if (this._connected) this._collections[name].setDb(this.db);
    return this._collections[name];
  },
  
  disconnect: function(){
    if (this._connected){
      this._db.close();
      this._connected = false;
    }
  },
  
  _onConnect: function(){
    this._connected = true;
    for (var i in this._collections) this._collections[i].setDb(this.db);
    this.emit('open');
  },

  type: function(name){
    return type.get(name);
  }
  
};

sys.inherits(Mongoose, EventEmitter);

var Collection = this.Collection = Class({
  
  init: function(base, name){
    this.base = base;
    this.name = name;
    this._queued = [];
  },
  
  setDb: function(db){
    var self = this;
    db.collection(this.name, function(err, collection){
      if (!err) return self.base.emit('error', err);
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

for (var i in require('../../support/node-mongodb-native/lib/mongodb/collection').Collection.prototype){
  (function(name){
    if (!(name in Collection.prototype)){
      Collection.prototype[name] = function(){
        return this._queue(name, arguments);
      };
    }
  })(i);
}