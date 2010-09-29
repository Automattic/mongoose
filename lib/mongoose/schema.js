var pluralize = require('./util').string.pluralize,
    sys = require('sys'),
    TypeSchema = require('./type'),
    Doc = require('./document'),
    clone = require('./util').clone;

var Schema = module.exports = function(name){
  this.paths = {};
  this._struct = [];
  this._embedded = {};
  this._current = null;
  if (typeof name == 'string'){
    this._name = name;
    this._collection = typeof arguments[1] == 'string' ? arguments[1] : pluralize(name);
    this._parent = null;
  } else {
    this._parent = name;
  }
  this._pres = {};
  this._posts = {};
  this._hooks = clone(Doc.Hooks);
  this._overrides = {};
  this._methods = {};
  this._statics = clone(Doc.Statics);

  this._model = function(){
    Doc.Document.apply(this, arguments);
  };
  sys.inherits(this._model, Doc.Document);
  Doc.defineMethod(this._model, '_schema', this);
  
};

Schema.prototype._addType = function(key, type){
  this.paths[key] = type;
  this._current = type;
  this.__defineGetter__(key, function(){
    var type = this.paths[key];
    if (type.options instanceof Schema) return type.options;
    else return type;
  });
  return this;
};

Schema.prototype.indexes = function(){
  return this;
};

Schema.prototype.setters = function(){
  return this;
};

Schema.prototype.getters = function(){
  return this;
};

Schema.prototype.pre = function(method, fn){
  if (!(method in this._pres)) this._pres[method] = [];
  this._pres[method].push(fn);
  return this;
};

Schema.prototype.post = function(method, fn){
  if (!(method in this._posts)) this._posts[method] = [];
  this._posts[method].push(fn);
  return this;
};

Schema.prototype.hook = function(method, fn){
  if(this._hooks[method]) this._overrides[method] = fn;
  else this._hooks[method] = fn;
  return this;
};

Schema.prototype.method = function(method, fn){
  this._methods[method] = fn;
  return this;
};

Schema.prototype.static = function(method, fn){
  this._statics[method] = fn;
  return this;
};

Schema.prototype.hooks = function(obj){
  for(method in obj){
    if(this._hooks[method]) this._overrides[method] = obj[method];
    else this._hooks[method] = obj[method];
  }
  return this;
};

Schema.prototype.methods = function(obj){
  for(method in obj){
    this._methods[method] = obj[method];
  }
  return this;
};

Schema.prototype.statics = function(obj){
  for(method in obj){
    this._statics[method] = obj[method];
  }
  return this;
};

Schema.prototype.plugin = function(fn,opts){
  fn(this,opts);
  return this;
};

Schema.prototype.__defineGetter__('_root', function(){
  var p = this;
  while (p._parent) p = p._parent
  return p;
});

Object.keys(TypeSchema.prototype).forEach(function(method){
  Schema.prototype[method] = function(){
    if(!this._current) return;
    this._current[method].apply(this._current,arguments);
    return this;
  }
});