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

Schema.prototype.__defineGetter__('root', function(){
  var p = this;
  while (p.parent) p = p.parent
  return p;
});