var pluralize = require('./util').string.pluralize;

var Schema = module.exports = function(name){
  if (typeof name == 'string'){
    this.name = name;
    this.collection = typeof arguments[1] == 'string' ? arguments[1] : pluralize(name);
    this.embedded = false;
  } else {
    this.embedded = true;
  }
}