
/**
 * Module dependencies.
 */

var mongoose = module.parent.exports
  , type = mongoose.type
  , ObjectID = mongoose.ObjectID;

// String
type('string')
  .set(function(val){
    switch (typeof val) {
      case 'string':
        return val;
      case 'number':
        return String(val);
      default:
        return Error;
    }
  })
  .setStrict(function(val){
    return 'string' == typeof val
      ? val
      : Error;
  });

// Array  
type('array')
  .set(function(val){
    return (val instanceof Array) ? val : [val];
  })
  .setStrict(function(val){
    return Array.isArray(val)
      ? val
      : Error;
  });

// Object
var toString = Object.prototype.toString;
type('object')
  .set(function(val){
    return (typeof val == 'object') ? val : {};
  })
  .setStrict(function(val){
    return '[object Object]' == toString.call(val)
      ? val
      : Error;
  });

// OID
type('oid')
  .default(function(){
    return new ObjectID();
  })
  .setup(function(key,path){
    if (key.charAt(0) == '_'){
      this.virtual(key.substr(1))
        .get(function(){
          return this.get(path).toHexString();
        })
        .set(function(val){
          return this.set(path, val);
        });
    }
  })
  .set(function(val){
    return val
      ? ((val instanceof ObjectID || val.toHexString) 
        ? val
        : ObjectID.createFromHexString(val))
      : new ObjectID();
  });

// Number
type('number')
  .set(function(val){
    if ('number' == typeof val) return val;
    val = parseFloat(String(val));
    return isNaN(val)
      ? Error
      : val;
  })
  .setStrict(function(val){
    return 'number' == typeof val
      ? val
      : Error;
  });

// Boolean
type('boolean', 'bool')
  .default(false)
  .set(function(val){
    return !!val;
  })
  .setStrict(function(val){
    return (true === val || false === val)
      ? val
      : Error;
  });

// Date
type('date')
  .set(function(val){
    if (val instanceof Date) return val;
    if ('string' != typeof val) return Error;
    val = Date.parse(val);
    return isNaN(val)
      ? Error
      : new Date(val);
  })
  .setStrict(function(val){
    return val instanceof Date
      ? val
      : Error;
  });

// Virtual  
type('virtual');

// Raw
type('raw');
