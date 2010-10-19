var clone = require('./util').clone,

/**
 * @param {String} name is the name of the type
 * @param {String} key
 * @param {Object|Schema} options
 * @param {Schema} schema is a reference to the Schema instance that this type is associated with
 */
TypeSchema = module.exports = function(name, key, options, schema){
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
TypeSchema._types = {}; // Used in TypeSchema.prototype.extend as a type registry to check against
                        // Would have used require("./index").type, except the require is circular
                        // because this file "./type" is referenced from "./index"

/**
 * Adds another setup function.
 * @param {Function} fn is the setup function we want to add with profile (...TODO)
 * @return {TypeSchema} this
 */
TypeSchema.prototype.setup = function(fn){
  this.setups.push(fn);
  return this;
};

/**
 * Declare this type to inherit from a parent type.
 * @param {String} parent is the names of the type from which this type should inherit
 * @return {TypeSchema} this
 */
TypeSchema.prototype.extend = function(parent){
  if (typeof parent === "string") {
    parent = TypeSchema._types[parent];
  }
  if(!(parent instanceof TypeSchema)) {
    throw new Error("parent must be either a TypeSchema instance or the name referencing the TypeSchema instance");
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