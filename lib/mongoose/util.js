var toString = Object.prototype.toString
  , DBRef = require('../../support/node-mongodb-native/lib/mongodb/bson/bson').DBRef;

/**
 * Walk the given `schema` paths, yielding the path string and 
 * and property object:
 *
 *     util.walk(schema, function(path, prop){
 *       // path "name.first" etc
 *       // prop.type etc
 *     });
 *
 * @param {Schema} schema
 * @param {Function} fn
 * @api public
 */

var walk = exports.walk = function(schema, struct, fn, path) {
  var path = path || []
    , prop
    , curpath;

  if ('function' == typeof struct) {
    fn = struct;
    struct = schema._struct;
  }

  for (var i = 0, len = struct.length; i < len; ++i) {
    prop = struct[i];
    if ('string' == typeof prop) {
      curpath = path.concat(prop).join('.');
      if (schema.paths[curpath].options && schema.paths[curpath].options._struct) {
        walk(schema, schema.paths[curpath].options._struct, fn, path);
      } else {
        fn(curpath, schema.paths[curpath]);
      }
    } else {
      prop = prop[0];
      curpath = path.concat(prop).join('.');
      walk(schema, struct[i][1], fn, path.concat(prop));
    }
  }
};

/**
 * @param {Schema} schema is the schema instance
 * @param {Object} obj is a hash
 * @param {Function} fn
 * @param {Array} path is the array of keys representing the property path
 */
var walkObject = exports.walkObject = function(schema, obj, fn, path, fullpatharr) {
  path = path || [];
  fullpatharr = fullpatharr || [];
  var curpath = path
    , val;
  for (var key in obj) if (obj.hasOwnProperty(key)) {
    val = obj[key];
    if (val instanceof DBRef) {
      fn(curpath.concat(key).join('.'), fullpatharr.concat(key), schema.paths[curpath.concat(key).join('.')], val);
    } else if ('[object Object]' == val.toString()) {
      walkObject(schema, val, fn, curpath.concat(key), fullpatharr.concat(key));
    } else {
      if (/^\$/.test(key)) { // Handle query "reserved" keywords
        fn(curpath.join('.'), fullpatharr.concat(key), schema.paths[curpath.join('.')], val);
      } else {
        fn(curpath.concat(key).join('.'), fullpatharr.concat(key), schema.paths[curpath.concat(key).join('.')], val);
      }
    }
  }
};

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
