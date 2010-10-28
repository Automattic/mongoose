
var clone = exports.clone = function(item){
  var copy;
  if (Object.prototype.toString.call(item) === '[object Array]'){
    copy = [];
    for (var i = 0; i < item.length; i++) copy[i] = clone(item[i]);
    return copy;
  } else if (typeof item == 'object') {
    copy = {};
    for (var key in item) copy[key] = clone(item[key]);
    return copy;
  } else {
    return item;
  }
};

exports.subclass = function(type, proto){
  // make sure we are extending a global constructor
  // accepted: [Boolean, Number, String, Array, Object, Function, RegExp, Date]
  if(!global[type.name] || global[type.name].name != type.name) throw new Error();

  var constructor = proto.constructor,
      keys = Object.keys(proto),
      Obj = process.binding('evals').Script.runInNewContext('x = '+type.name), // eval ftw
      obj = function(){
        var instance = new Obj();
        if(constructor) constructor.apply(instance, arguments);
        return instance;
      };
      obj.prototype.__proto__ = type.prototype; // passes instanceof 'type'
      Obj.prototype.__proto__ = obj.prototype; // passes instanceof 'this'

  for(var i=0,l=keys.length; i<l; i++){
    if(keys[i] != 'constructor') Obj.prototype[keys[i]] = proto[keys[i]]; 
  }
  return obj;
};