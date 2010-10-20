var clone = require('./util').clone;

/**
 * @param {String} name is the name of the type
 * @param {String} key
 * @param {Object|Schema} options
 * @param {Schema} schema is a reference to the Schema instance that this type is associated with
 */

var TypeSchema = module.exports = function(name, key, options, schema){
  this.type = name;
  this.key = key;
  this.options = options;
  this.schema = schema;
  this.setups = this.setups ? clone(this.setups) : [];
  this.getters = this.getters ? clone(this.getters) : [];
  this.setters = this.setters ? clone(this.setters) : [];
  this.validators = this.validators ? clone(this.validators) : {};
  this._doc = [];
  return this;
};

TypeSchema.prototype.setup = function(fn){
  this.setups.push(fn);
  return this;
};

TypeSchema.prototype.extend = function(parent){
  if(!(parent instanceof TypeSchema)){
    parent = require('./').type(parent); // require inline because of the circular reference with type
  }
  this.parent = parent.type;
  this.setups = parent.setups.concat(this.setups);
  this.getters = parent.getters.concat(this.getters);
  this.setters = parent.setters.concat(this.setters);
  for(i in parent.validators){
    if(!this.validators[i]) 
      this.validators[i] = parent.validators[i];
  }
  if(!this.index) this.index = parent.index;
  if(!this.default) this.default = parent.default;
  return this;
};

TypeSchema.prototype.get = function(fn){
  this.getters.push(fn);
  return this;
};

TypeSchema.prototype.set = function(fn){
  this.setters.push(fn);
  return this;
};

TypeSchema.prototype.castGet = function(fn){
  this._castGet = fn;
  return this;
};

TypeSchema.prototype.castSet = function(fn){
  this._castSet = fn;
  return this;
};

TypeSchema.prototype.validate = function(name,fn){
  this.validators[name] = fn;
  return this;
};

TypeSchema.prototype.required = function(bool){
  this._required = !!bool;
  return this;
};

TypeSchema.prototype.index = function(order){
  this.index = order || 1;
  return this;
};

TypeSchema.prototype.default = function(val){
  this._default = val;
  return this;
};

TypeSchema.prototype.doc = function(markdown){
  this._doc.push(markdown);
  return this;
};