// ext.js - String - Inflections - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

var uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paprer',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news'
];

var pluralRules = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/$/gi, 's']
];

function inflect(str, rules) {
  var rule
  if (uncountables.indexOf(str.toLowerCase()) == -1){
    rule = rules.filter(function(rule){ return str.match(rule[0]); });
    if (rule && rule[0])
      return str.replace(rule[0][0], rule[0][1]);
  }
  return str;
}

function clone(item){
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
}

module.exports = {
  
  string: {
    
    pluralize: function(str){
      return inflect(str, pluralRules);
    }
    
  },
  
  clone: clone,

  subclass: function(type, proto){
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
  },
  
  capitalize: function(str){
    return str.charAt(0).toUpperCase() + str.substr(1);
  }
  
};

_define = function(proto, key, value){
  Object.defineProperty(proto, key, {value: value, enumerable: false});
};