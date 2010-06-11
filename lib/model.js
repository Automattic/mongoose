var EventEmitter = require('events').EventEmitter,
    Class = require('./util').Class,
    object = require('./util').object,
    query = require('./query'),
    
Model = this.Model = Class({
  
  include: [EventEmitter.prototype],
  
  extend: {
    find: function(where, hydrate){
      if (arguments.length == 3) throw new Error('Subsets are not implemented yet.');
      var _where = where || {}, self = this,
      _writer = new query.Writer(function(query, options, promise){
        self._collection.find(query, options, function(err, cursor){
          if (err) return self._connection._error(err);
          cursor.toArray(function(err, results){
            if (err) return self._connection._error(err);
            if (hydrate !== false){
              results.forEach(function(doc, i){
                results[i] = new self(doc,true);
              });
            }
            promise.complete(results);
          });
        });
      });
      for (var i in _where) _writer.where(i, _where[i]);
      return _writer;
    },
    
    findById: function(id, fn, hydrate){
      return this.find({_id: id}, hydrate).first(fn);
    },
    
    remove: function(where, fn){
      this._collection.remove(where, function(err){
        if (err) return self._connection._error(err);
        fn();
      });
      return this;
    },
    
    count: function(where, fn){
      this._collection.count(where, function(err, count){
        if (err) return self._connection._error(err);
        fn(count);
      });
      return this;
    }
  },
  
  init: function(doc, hydrate){
    this._schema();
    _define(this, 'isNew', true);
    _define(this, '_dirty', {});
    if (hydrate) this._hydrate(doc);
  },
  
  _hydrate: function(doc){
    object.mixin(true, this.__doc, doc);
    this.isNew = false;
    return this;
  },
  
  _error: function(err){
    this.emit('error', err);
  },
  
  _set: function(path, value){
    var parts = path.split('.'), doc = this.__doc;
    for (var i = 0, l = parts.length; i < l; i++){
      if (i + 1 == l){
        if (doc[parts[i]] !== value){
          this._dirty[path] = true;
          if(this._casters[path]) doc[parts[i]] = this._cast(this._casters[path],value); // casting
          else doc[parts[i]] = value;
        }
      } else {
        doc = doc[parts[i]];
      }
    }
    return this;
  },
  
  _get: function(path){
    var parts = path.split('.'), doc = this.__doc;
    for (var i = 0, l = parts.length; i < l; i++){
      doc = doc[parts[i]];
      if (typeof doc == 'undefined') throw new Error('Path ' + path + ' is undefined');
    }
    return doc;
  },
  
  _cast: function(type,val){
    switch(type.name){
      case 'String': val += ''; break;
      case 'Number': val = parseFloat(val);
      default: val = new type(val); break;
    }
    return val;
  },
  
  isDirty: function(n){
    if (typeof n == 'string') return n in this._dirty;
    return !!Object.keys(this._dirty).length;
  },
  
  toObject: function(){
    return this.__doc;
  },
  
  model: function(model){
    return this._connection.model(model);
  },
  
  save: function(fn){
    var self = this;
    this._collection.save(this.__doc, function(){
      self.isNew = false;
      if(fn) fn();
    });
    return this;
  },
  
  remove: function(fn){
    if (this.isNew){
      if (fn) fn();
      return this;
    }
    this._collection.remove({ _id: this.__doc._id }, fn);
    return this;
  }
  
}),

_define = function(proto, key, value){
  Object.defineProperty(proto, key, {value: value, enumerable: false});
};

(function(){

  Model.compile = function(name, model, connection){
    var _model = object.mixin(true, {}, model),
        _definition = _model.methods || {}, 
        _collection = _model.collection || (name.toLowerCase() + 's'),
        _props = _model.properties, setters = _model.setters || {}, getters = _model.getters || {}, 
        _indexes = _model.indexes, _cast = _model.cast || {};
        _definition.extend = _model['static'] || {};
    var doc = _compileProperties(_props);
    doc._id = null;
    _model = Model.extend(_definition);
    _model._connection = connection;
    _model._collection = connection.collection(_collection);
    if (_indexes && _indexes.length) _model._collection.setIndexes(_indexes);
    _define(_model.prototype, '_connection', _model._connection);
    _define(_model.prototype, '_collection', _model._collection);
    _define(_model.prototype,'_schema', new Function('this.__doc = ' + JSON.stringify(doc)));
    _define(_model.prototype,'_casters', _cast);
    _compileEtters(doc, getters, setters, _model.prototype);
    return _model;
  };
  
  var _compileProperties = function(props){
    var _props = props || [], _ret = {}, prop, field;
    for(i=0, l= _props.length; i < l; i++){
      prop = _props[i];
      if(Object.prototype.toString.call(prop) == '[object Object]'){
        for(field in prop){
          if(prop[field] instanceof Array){
            if(!prop[field].length) _ret[field] = [];
            else if(prop[field][0] instanceof Array) _ret[field] = [];
            else _ret[field] = _compileProperties(prop[field]);
          }
        }
      } else _ret[prop] = null;
    }
    return _ret;
  },

  _compileEtters = function(props, getters, setters, prototype, path){
    for (var i in props){
      var p = (path ? path + '.' : '') + i;
      (function(props, getters, setters, p, i){
        if (props[i] == null || props[i] instanceof Array){
          prototype.__defineGetter__(i, function(){
            return getters[i] ? getters[i].apply(this, [this._get(p)]) : this._get(p);
          });
          prototype.__defineSetter__(i, function(v){
            this._set(p, setters[i] ? setters[i].apply(this, [v]) : v);
          });
        } else {
          if (!('__getters__' in prototype)) _define(prototype,'__getters__',{value:{}, enumerable:false});
          prototype.__defineGetter__(i, function(){
            if (!(p in this.__getters__)){
              var nested = function(){};
              nested.prototype = this;
              _compileEtters(props[i], getters[i] || {}, setters[i] || {}, nested.prototype, p);
              this.__getters__[p] = new nested();
            }
            return this.__getters__[p];
          });
        }
      })(props, getters, setters, p, i);
    }
    
    for (var i in getters){
      if (prototype.__lookupGetter__(i)) continue;
      if (typeof getters[i] !== 'function') throw new 'Virtual getter namespaces are not supported';
      (function(i){
        Object.defineProperty(prototype,i,{get: function(){ return getters[i].apply(this); }, enumerable: false});
      })(i, getters);
    }
    for (var i in setters){
      if (prototype.__lookupSetter__(i) || typeof setters[i] !== 'function') continue;
      (function(i){
        Object.defineProperty(prototype,i,{set: function(){ return setters[i].apply(this); }, enumerable: false});
      })(i, setters);
    }
  };
  
})();