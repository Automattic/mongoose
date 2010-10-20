
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
  });

// Strict string
type('strict string')
  .set(function(val){
    return 'string' == typeof val
      ? val
      : Error;
  });

// Array  
type('array')
  .set(function(val){
    return (val instanceof Array) ? val : [val];
  });

// Strict array
type('strict array')
  .set(function(val){
    return Array.isArray(val)
      ? val
      : Error;
  });

// Object
type('object')
  .set(function(val){
    return (typeof val == 'object') ? val : {};
  });

// Strict object
var toString = Object.prototype.toString;
type('strict object')
  .set(function(val){
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
  });

// Strict number
type('strict number')
  .set(function(val){
    return 'number' == typeof val
      ? val
      : Error;
  });

// Boolean
type('boolean')
  .set(function(val){
    return !!val;
  });

// Strict boolean
type('strict boolean')
  .set(function(val){
    return (true === val || false === val)
      ? val
      : Error;
  });

// Date
type('date')
  .set(function(val){
    return val instanceof Date
      ? val
      : (typeof val == 'string' && isNaN(Date.parse(val)))
        ? undefined
        : new Date(val);
  });

// Virtual  
type('virtual');

// Raw
type('raw');
