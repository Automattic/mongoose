var pluralize = require('./util').string.pluralize;
var TypeSchema = require('./type');

var Schema = module.exports = function(name){
  this.paths = {};
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
  this._overrides = {};
};

Schema.prototype._addType = function(key, type){
  this.paths[key] = type;
  this._current = type;
  return this;
};

Schema.prototype.virtual = function(){
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
};

Schema.prototype.post = function(method, fn){
  if (!(method in this._posts)) this._posts[method] = [];
  this._posts[method].push(fn);
};

Schema.prototype.method = function(method, fn){
  this._overrides[method] = fn;
  return this;
};

Schema.prototype.static = function(){
  return this;
};

Schema.prototype.methods = function(){
  return this;
};

Schema.prototype.statics = function(){
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