var EventEmitter = require('events').EventEmitter,
    query = require('query'),
    
Model = this.Model = Class({
  
  include: [EventEmitter.prototype],
  
  extend: {
    find: function(where, hydrate){
      if (arguments.length == 3) throw new Error('Subsets are not implemented yet.');
      var _where = where || {}, self = this,
      _writer = new query.Writer(function(query, options, promise){
        this._collection.find(query, options, function(err, cursor){
          if (err) return self._error(err);
          cursor.toArray(function(err, results){
            if (err) return self._error(err);
            // please hydrate me!
            promise.complete(results);
          });
        });
      });
      for (var i in _where) _writer.where(i, _where[i]);
      return _writer;
    }
  },
  
  init: function(){
    this.isNew = true;
    this.isDirty = false;
  },
  
  _error: function(err){
    this.emit('error', err);
  },
  
  _set: function(path, value){
    var parts = path.split('.'), doc = this.__doc, dirty = false;
    for (var i = 0, l = parts.length; i < l; i++){
      doc = doc[i];
      if (!dirty && (typeof doc == 'object' || (i + 1 == l))){
        dirty = true;
        this._dirty = path;
      }
    }
    doc = value;
  },
  
  _get: function(path){
    var parts = path.split('.'), doc = this.__doc;
    for (var i = 0, l = parts.length; i < l; i++){
      doc = doc[i];
      if (typeof doc == 'object' && i + 1 !== l){
        throw new Error("Can't access " + path);
      }
    }
    return doc;
  },
  
  _hydrate: function(doc){
    this.isNew = false;
    Object.merge(this.__doc, doc);
  },
  
  isDirty: function(n){
    if (typeof n == 'string') return n in this._dirty;
    return !!Object.keys(this._dirty).length;
  },
  
  toObject: function(){
    return this.__doc;
  },
  
  save: function(fn){
    var self = this;
    this._collection.save(this.__doc, function(){
      self.isNew = false;
      fn();
    });
    return this;
  },
  
  remove: function(fn){
    if (this.isNew){
      fn();
      return this;
    } 
    this._collection.remove({ _id: this.__doc._id }, fn);
    return this;
  }
  
}),

_compileProperties = function(props){
  var _props = props || [], _ret = {};
  _props.forEach(function(prop){
    if (typeof prop == 'string'){
      _ret[prop] = null;
    } else if (prop instanceof Array){
      // inspect first element
      if (_props[prop].length == 0)
        throw new Error('Bad `properties` definition. Empty array');
      if (_props[prop].length > 1)
        throw new Error('Bad `properties` definition. An array cannot contain multiple elements.');
      switch (typeof _props[prop][0]){
        // here we should instead add an EmbeddedArray, so that we can have setters/getters support for embedded objects
        case 'string':
          _ret[_props[prop][0]] = [];
          break
        case 'object':
          for (var i in _props[prop][0]){
            _ret[_props[prop][0][i]] = [];
            break;
          }
          break;
        default:
          throw new Error('Bad `properties` definition. Array contains illegal element')
      }
    }
  });
  _ret[id] = null;
  return _ret;
};

Model.compile = function(name, _model, connection){
  var _definition = {}, _collection = _model.collection || (name.toLowerCase() + 's');
  _definition.extend = _model['static'] || {};
  _model = Model.extend(_definition);
  _model.prototype._connection = _model._connection = connection;
  _model.prototype._collection = _model._collection = connection.collection(_collection);
  _model.prototype.__doc = _compileProperties(_model.properties);
  this._compiled[model] = _model;
  return _model;
};