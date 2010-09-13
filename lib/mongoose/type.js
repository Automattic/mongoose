var TypeDefinition = module.exports = function(name){
  this.type = name;
  this.getters = [];
  this.setters = [];
  this.validators = {};
  return this;
};

TypeDefinition.prototype.extend = function(type){
  var def = Definitions[type];
  if(def){
    this.extends = type;
    this.getters.splice(0, 0, def.getters);
    this.setters.splice(0, 0, def.setters);
    for(i in def.validators) this.validators[i] = def.validators[i];
  }
  return this;
};

TypeDefinition.prototype.get = function(fn){
  this.getters.push(fn);
  return this;
};

TypeDefinition.prototype.set = function(fn){
  this.setters.push(fn);
  return this;
};

TypeDefinition.prototype.cast = function(fn){
  this.setters[0] = fn;
  return this;
};

TypeDefinition.prototype.validator = function(name,fn){
  this.validators[name] = fn;
  return this;
};