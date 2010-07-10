var EventEmitter = require('events').EventEmitter,
    Class = require('./util').Class,
    ObjectID = require('mongodb').ObjectID,
    object = require('./util').object,
    query = require('./query'),
    
Model = this.Model = Class({
  
  include: [EventEmitter.prototype],
  
  init: function(doc, hydrate){
    this.__doc = this._schema();
    this.__doc._id = new ObjectID();
    this.isNew = true;
    this._dirty = {};
    if (hydrate){
      this._hydrate(doc);
    } else if(doc){
      this.merge(doc);
    } 
  },
  
  _hydrate: function(doc){
    object.mixin(true, this.__doc, doc);
    this.isNew = false;
    return this;
  },
  
  _error: function(err){
    this.emit('error', err);
  },
  
  merge: function(doc, _parent){
    _parent = _parent || this;
    var keys = Object.getOwnPropertyNames(doc);
    keys.forEach(function(i){
      if (_parent[i] && typeof(_parent[i] == 'object') && !(_parent[i] instanceof Array)) this.merge(doc[i], _parent[i]);
      else _parent[i] = doc[i];
    }, this);
  },
  
  _set: function(path, value, internal){
    var parts = path.split('.'), doc = this.__doc;
    for (var i = 0, l = parts.length; i < l; i++){
      if (i + 1 == l){
        if (doc[parts[i]] !== value){
          if (!internal) this._dirty[path] = true;
          if(this._casters[path]) value = this._cast(this._casters[path], value); // casting
          if(value !== undefined) doc[parts[i]] = value;
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
    switch(type){
      case String:
        val  = (val instanceof String) ? val : val+'';
        break;
      case Number: 
        val = (val instanceof Number) ? val : parseFloat(val);
        break;
      case ObjectID:
        val = (val instanceof ObjectID || val.toHexString) ? val : ObjectID.createFromHexString(val);
        break;
      default: val = new type(val); break;
    }
    return val;
  },
  
  _normalize: function(){
    var cast, parts, doc;
    
    for(var i=0,l=this._arrays.length; i < l; i++){ // type casting for arrays
      if(this._casters[this._arrays[i]]){
        parts = this._arrays[i].split('.'); doc = this.__doc;
        for(var k=0, len = parts.length; k < len; k++) doc = doc[parts[k]];
        if(doc instanceof Array)
          for(var j=0, ll= doc.length; j < ll; j++) 
            doc[j] = this._cast(this._casters[this._arrays[i]],doc[j]);
      }
    }
    
    return this.__doc;
  },
  
  isDirty: function(n){
    if (typeof n == 'string') return n in this._dirty;
    return !!Object.keys(this._dirty).length;
  },
  
  toObject: function(){
    return this._normalize();
  },
  
  toJSON: function(){
    return JSON.stringify(this._normalize());
  },
  
  model: function(model){
    return this._connection.model(model);
  },
  
  save: function(fn){
    var self = this;
    this._collection.save(this._normalize(), function(){
      self.isNew = false;
      if(fn) fn();
    });
    return this;
  },
  
  fire: function(){
    var args = Array.prototype.slice.call(arguments);
    this.emit.apply(this, args);
    this.static.emit.apply(this.static, args.concat(this));
    return this;
  },
  
  remove: function(fn){
    if (this.isNew){
      if (fn) fn();
      return this;
    }
    this._collection.remove({ _id: this._id }, fn || function(){});
    return this;
  },
  
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
              results = results.map(function(doc){
                return new self(doc, true);
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
      id = (id instanceof ObjectID || id.toHexString) ? id : ObjectID.createFromHexString(id);
      var writer = this.find({_id: id}, hydrate);
      if (fn) return writer.first(fn);
      return writer;
    },

    remove: function(where, fn){
      var self = this;
      this._collection.remove(where || {}, function(err){
        if (err) return self._connection._error(err);
        fn();
      });
      return this;
    },
    
    count: function(where, fn){
      var self = this;
      this._collection.count(where || {}, function(err, count){
        if (err) return self._connection._error(err);
        fn(count);
      });
      return this;
    }
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
        _indexes = _model.indexes, _cast = _model.cast || {}, _arrays = [];
        _definition.extend = _model['static'] || {};
    var doc = _compileProperties(_props,_arrays);
    doc._id = null;
    _model = Model.extend(_definition);
    for (var i in EventEmitter.prototype) _model[i] = EventEmitter.prototype[i];
    _model._connection = connection;
    _model._collection = connection.collection(_collection);
    if (_indexes && _indexes.length) _model._collection.setIndexes(_indexes);
    _compileEtters(doc, getters, setters, _model.prototype, _cast);
    _define(_model.prototype, '_connection', _model._connection);
    _define(_model.prototype, '_collection', _model._collection);
    _define(_model.prototype,'_schema', new Function('return ' + JSON.stringify(doc)));
    _define(_model.prototype,'_casters', _cast);
    _define(_model.prototype,'_arrays', _arrays);
    _define(_model.prototype,'static', _model);
    return _model;
  };
  
  var _compileProperties = function(props,_arr,path){
    var _props = props || [], _ret = {}, prop, field, p, i, l;
    for(i=0, l= _props.length; i < l; i++){
      prop = _props[i];
      if(Object.prototype.toString.call(prop) == '[object Object]'){
        for(field in prop){
          if(prop[field] instanceof Array){
            _arr.push((path ? path + '.' : '') + field);
            if(!prop[field].length) _ret[field] = [];
            else if(prop[field][0] instanceof Array) _ret[field] = [];
            else _ret[field] = _compileProperties(prop[field],_arr,p);
          }
        }
      } else _ret[prop] = null;
    }
    return _ret;
  },

  _compileEtters = function(props, getters, setters, prototype, cast, path){
    for (var i in props){
      var p = (path ? path + '.' : '') + i;
      if (/^_/.test(i) && !(i in cast)) cast[p] = ObjectID;
      (function(props, getters, setters, p, i){
        if (props[i] === null || props[i] instanceof Array){
          prototype.__defineGetter__(i, function(){
            return getters[i] ? getters[i].apply(this, [this._get(p)]) : this._get(p);
          });
          prototype.__defineSetter__(i, function(v){
            this._set(p, setters[i] ? setters[i].apply(this, [v]) : v);
          });
        } else {
          prototype.__defineGetter__(i, function(){
            if (!('__getters__' in this)) _define(this, '__getters__', {});
            if (!(p in this.__getters__)){
              var nested = function(){};
              nested.prototype = this;
              _compileEtters(props[i], getters[i] || {}, setters[i] || {}, nested.prototype, cast, p);
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
        prototype.__defineGetter__(i, function(){ return getters[i].apply(this); });
      })(i, getters);
    }
    for (var i in setters){
      if (prototype.__lookupSetter__(i) || typeof setters[i] !== 'function') continue;
      (function(i){
        prototype.__defineSetter__(i, function(v){ return setters[i].apply(this, [v]); });
      })(i, setters);
    }
  };
  
})();