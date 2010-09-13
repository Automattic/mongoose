
var TypeDefinition = module.exports.TypeDefinition =  function(name){
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
  this.schema.getters.push(fn);
  return this;
};

TypeDefinition.prototype.set = function(fn){
  this.schema.setters.push(fn);
  return this;
};

TypeDefinition.prototype.cast = function(fn){
  this.schema.setters[0] = fn;
  return this;
};

TypeDefinition.prototype.validator = function(name,fn){
  this.schema.validators[name] = fn;
  return this;
};