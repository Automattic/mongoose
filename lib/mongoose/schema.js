var pluralize = require('./util').string.pluralize,
    sys = require('sys'),
    TypeSchema = require('./type'),
    Doc = require('./document'),
    clone = require('./util').clone;

/**
 * @constructor
 */
var Schema = module.exports = function(name){
  this.paths = {}; // Maps attribute names to type instances
  this._struct = []; // Stores either 1. the names of the attributes
                     //            or 2. elements like [attributeName, subtype._struct]
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

/**
 * Add several hooks at a time (pre-compilation).
 * Hooks are special non-enumerable methods. The standard hooks added via this method include:
 * - init(fn, obj, isNew)
 * - hydrate(fn, obj)
 * - merge(fn, obj)
 * - save(fn)
 * - remove(fn)
 * - (See document.js Doc.Hooks for more details)
 *
 * @param {Object} obj is a dictionary mapping (to-be) hook names to functions
 *                 that we want to add to this Schema's prototype.
 */
Schema.prototype.hooks = function(obj){
  for(method in obj){
    if(this._hooks[method]) this._overrides[method] = obj[method];
    else this._hooks[method] = obj[method];
  }
  return this;
};

/**
 * Add several instance (prototype) methods at a time (pre-compilation).
 * @param {Object} obj is a dictionary mapping (to-be) instance method names to functions
 *                 that we want to add to this Schema's prototype.
 */
Schema.prototype.methods = function(obj){
  for(method in obj){
    this._methods[method] = obj[method];
  }
  return this;
};

/**
 * Add several class methods at a time (pre-compilation).
 * 
 * Example:
 * schema.statics({
 *  doInception: function () {},
 *  dropToAnotherLevel: function () {}
 * });
 *
 * @param {Object} obj is a dictionary mapping (to-be) class method names to functions
 *                 that we want to add to this Schema's class methods
 * @return {Schema} this
 */
Schema.prototype.statics = function(obj){
  for(method in obj){
    this._statics[method] = obj[method];
  }
  return this;
};

/**
 * Add the plugin's functionality to the Schema.
 * @param {Function} fn is the decorator function
 * @param {Object} opts are the plugin options
 * @return {Schema} this
 */
Schema.prototype.plugin = function(fn,opts){
  fn(this,opts);
  return this;
};

/**
 * Getter for the topmost ancestor in the inheritance tree.
 */
Schema.prototype.__defineGetter__('_root', function(){
  var p = this;
  while (p._parent) p = p._parent
  return p;
});

/**
 * Gets the ABSOLUTE path given the relative path represented by
 * arr. In other words,
 * - this is a Schema instance in an inheritance tree
 * - arr is a list of properties (e.g., ['user', 'name', 'first'] that
 *   looks up a value in this -- e.g., this.user.name.first
 * @param {Array} arr
 * @return {String} the absolute path string
 */
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
