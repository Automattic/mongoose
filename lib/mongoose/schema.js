var pluralize = require('./util').string.pluralize;

var Schema = module.exports = function(name){
  if (typeof name == 'string'){
    this.name = name;
    this.collection = typeof arguments[1] == 'string' ? arguments[1] : pluralize(name);
    this.parent = null;
  } else {
    this.parent = name;
  }
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

Schema.prototype.__defineGetter__('root', function(){
  var p = this;
  while (p.parent) p = p.parent
  return p;
});