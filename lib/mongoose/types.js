var mongoose = module.parent.exports
  , type = mongoose.type
  , ObjectID = require('../../support/node-mongodb-native/lib/mongodb').ObjectID
  , EmbeddedArray = require("./document").EmbeddedArray;

// String
type('string')
  .set(function(val){
    return (typeof val == 'string') ? val : val+'';
  });

// Array  
type('array')
  .set(function (val, path) {
    this._.arrays[path] = new EmbeddedArray(val, path, type('array'), this, false);
    this._.dirty[path] = [];
    return this._.arrays[path].arr;
  })
  .set(function(val){
    return (val instanceof Array) ? val : [val];
  })
  ._pre('hydrate', function (val, path) {
    this._.arrays[path] = new EmbeddedArray(val, path, type('array'), this, true);
    return this._.arrays[path].arr;
  })
  .flagDirty( function (path) {
    this._.dirty[path] = [];
  });

// Object
type('object')
  .set(function (val, path) {
    for (prop in val) {
      this.set(path + '.' + prop, val[prop]);
    }
    return val;
  })
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
    return (val) ? ((val instanceof ObjectID || val.toHexString) ? val : ObjectID.createFromHexString(val)) : new ObjectID();
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

// Raw
type('raw');
