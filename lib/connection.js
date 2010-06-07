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
    this.db = new mongo.Db(this.name, new mongo.Server(uri.hostname, uri.port, options));
    this.db.open(function(err){
      if (err) return self._error("Can't connect to " + url.format(uri));
      self.db.collection(function(err, collection){
        if (err) return self._error(err);
        self._collection = collection;
      });
    });
    this._compiled = {};
    this._queued = [];
    EventEmitter.call(this);
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
    var _model = this.base.model(model), _definition;
    _definition.extend = _model['static'] || {};
    _definition.include = [Model];
    _definition.__doc = this._compileProperties(_model.properties);
    _model = Class(_definition);
    _model.prototype._connection = _model._connection = this;
    this._compiled[model] = _model;
    return _model;
  },
  
  _compileProperties: function(props){
    var _props = props || [], _ret = {};
    _props.forEach(function(prop){
      if (typeof prop == 'string'){
        _ret[prop] = '';
      } else if (prop instanceof Array){
        // inspect first element
        if (_props[prop].length == 0)
          throw new Error('Bad `properties` definition. Empty array');
        if (_props[prop].length > 1)
          throw new Error('Bad `properties` definition. An array cannot contain multiple elements.');
        switch (typeof _props[prop][0]){
          // simply an array
          case 'string':
            _ret[_props[prop][0]]
            break
          case 'object':
            break;
          default:
            throw new Error('Bad `properties` definition. Array contains illegal element')
        }
      }
    });
    return _props;
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