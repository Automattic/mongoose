var en = require('../../support/lingo').en,
    sys = require('sys'),
    TypeSchema = require('./type'),
    Doc = require('./document'),
    clone = require('./util').clone,
    Query = require('./query');

/**
 * @constructor
 */
var Schema = module.exports = function(name){
  this.Query = function(){ Query.apply(this, arguments); };
  this.Query.prototype.__proto__ = Query.prototype;

  this.paths = {}; // Maps attribute names to type instances
  this._struct = []; // Stores either 1. the names of the attributes
                     //            or 2. elements like [attributeName, subtype._struct]
  this._embedded = {};
  this._current = null;
  if (typeof name == 'string'){
    this._name = name;
    this._collection = typeof arguments[1] == 'string' ? arguments[1] : en.pluralize(name);
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
  this._description = [];
  
  this._staticGetters = {};
  this._staticSetters = {};

  // Used from Connection.prototype._compile as the superclass
  // to the model that is compiled
  this._model = function(){
    Doc.Document.apply(this, arguments);
  };
  sys.inherits(this._model, Doc.Document);
  Doc.defineMethod(this._model, '_schema', this);
};

/**
 * @param {String} key is the name of the document attribute we're adding to this
 * @param {TypeSchema} type is the type instance we're assigning to the key
 * @return {Schema} this
 */
Schema.prototype._addType = function(key, type){
  this.paths[key] = type;
  this._current = type;
  this.__defineGetter__(key, function(){
    var type = this.paths[key];
    if (type.options instanceof Schema) return type.options;
    else return type;
  });
  if (type._addedTo) type._addedTo(this, key, type);
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

Schema.prototype.staticGetter = function(name, fn){
  
  this._staticGetters[name] = fn;
  return this;
};

Schema.prototype.staticSetter = function(name, fn){
  this._staticSetters[name] = fn;
  return this;
}

Schema.prototype.plugin = function(fn,opts){
  fn(this,opts);
  return this;
};

Schema.prototype.description = function(markdown){
  this._description.push(markdown);
  return this;
};

Schema.prototype.__defineGetter__('_root', function(){
  var p = this;
  while (p._parent) p = p._parent
  return p;
});

Schema.prototype.getPath = function(arr){
  var path = arr || [], p = this;
  while(p._parent){
    path.unshift(p._pkey);
    p = p._parent;
  }
  return path.join('.');
};

Object.keys(TypeSchema.prototype).forEach(function(method){
  Schema.prototype[method] = function(){
    if(!this._current) return;
    this._current[method].apply(this._current,arguments);
    return this;
  }
});
