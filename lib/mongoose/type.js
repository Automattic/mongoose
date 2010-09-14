var TypeSchema = module.exports = function(name, key, options, schema){
  this.type = name;
  this.key = key;
  this.options = options;
  this.schema = schema;
  this.setups = [];
  this.getters = [];
  this.setters = [];
  this.validators = {};
  return this;
};

TypeSchema.prototype.setup = function(fn){
  this.setups.push(fn);
  return this;
};

TypeSchema.prototype.extend = function(type){
  this.parent = type;
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

TypeSchema.prototype.index = function(order){
  this.index = order || 1;
  return this;
};

TypeSchema.prototype.default = function(val){
  this.default = val;
  return this;
};