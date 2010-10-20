
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

// Object
type('object')
  .set(function(val){
    return (typeof val == 'object') ? val : {};
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
    return val instanceof Number
      ? val
      : parseFloat(val);
  });

// Boolean
type('boolean')
  .set(function(val){
    return !!val;
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
