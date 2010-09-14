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

var compileType = function(type){
  var obj = {
    type: type.type,
    key: type.key,
    options: type.options,
    setups: type.setups,
    getters: type.getters,
    setters: type.setters,
    validators: type.validators,
    index: type.index,
    'default': type.default
  },
  parent = type.parent;
  
  while(parent){
    var extend = mongoose.type(parent);
    Array.prototype.splice.apply(obj.setups, extend.setups.unshift(0, 0));
    Array.prototype.splice.apply(obj.getters, extend.getters.unshift(0, 0));
    Array.prototype.splice.apply(obj.setters, extend.setters.unshift(0, 0));
    for(i in extend.validators){
      if(!obj.validators[i]) 
        obj.validators[i] = extend.validators[i];
    }
    if(!obj.index) obj.index = extend.index;
    if(!obj.default) obj.default = extend.default;
    parent = extend.parent;
  }
  
  if(type._castGet) obj.getters.unshift(type._castGet);
  if(type._castSet) obj.setters.unshift(type._castSet);
  
  return obj;
};


Schema.prototype._compile = function(path){
  this._compiled = {};
  for(p in this.paths){
    path = (path) ? p : path + '.' + p;
    var opts = this.paths[p].options;
    if(opts instanceof Schema){
      opts._compile(path);
      for(embedPath in opts._compiled)
        this._compiled[path+'.'+embedPath] = opts._compiled[embedPath];
    } else {
      this._compiled[path] = compileType(this.paths[p]);
    }
  }
  return this;
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