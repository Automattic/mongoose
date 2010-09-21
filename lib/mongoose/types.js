var mongoose = module.parent.exports
  , type = mongoose.type
  , ObjectID = require('../../support/node-mongodb-native/lib/mongodb').ObjectID;

// String
type('string')
  .set(function(val){
    return (typeof val == 'string') ? val : val+'';
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
    return (val instanceof ObjectID || val.toHexString) ? val : ObjectID.createFromHexString(val);
  });

// Number
type('number')
  .set(function(val){
    return (val instanceof Number) ? val : parseFloat(val);
  });

// Boolean
type('boolean')
  .set(function(val){
    return !!val;
  });

// Date
type('date')
  .set(function(val){
    return (val instanceof Date) ? val : 
      (typeof val == 'string' && isNaN(Date.parse(val))) ? undefined : new Date(val);
  });
  
// Virtual  
type('virtual');