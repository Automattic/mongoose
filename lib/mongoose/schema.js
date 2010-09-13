var Schema = module.exports = function(name){
  if (typeof name == 'string'){
    this.name = name;
    this.collection = typeof arguments[1] == 'string' ? arguments[1] : name.toLowerCase() + 's';
  }
}