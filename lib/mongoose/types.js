var mongoose = module.parent.exports,
    type = mongoose.type;

// String
type('string')
  .set(function(val,key){
    return (typeof val == 'string') ? val : val+'';
  });

// Array  
type('array')
  .set(function(val,key){
    return (val instanceof Array) ? val : [val];
  });

// Object
type('object')
  .set(function(val,key){
    return (typeof val == 'object') ? val : {};
  });

// OID
type('oid')
  .get(function(val,key){
    return (val instanceof ObjectID) ? val.toHexString() : val;
  })
  .set(function(val,key){
    return (val instanceof ObjectID || val.toHexString) ? val : ObjectID.createFromHexString(val);
  })

// Number
type('number')
  .set(function(val,key){
    return (val instanceof Number) ? val : parseFloat(val);
  });

// Boolean
type('boolean')
  .set(function(val,key){
    return !!val;
  });

// Date
type('date')
  .set(function(val,key){
    return (val instanceof Date) ? val : 
      (typeof val == 'string' && isNaN(Date.parse(val))) ? undefined : new Date(val);
  });