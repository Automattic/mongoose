var assert = require('assert')
  , TypeSchema = require('../lib/mongoose/type');

module.exports = {
  
  'test types': function(){
    var mongoose = require('../'),
        type = mongoose.type,
        str = type('string');
        
    assert.ok(typeof type == 'function');
    
    assert.ok(mongoose._types['string']);
    assert.ok(mongoose._types['number']);
    assert.ok(mongoose._types['oid']);
    assert.ok(mongoose._types['object']);
    assert.ok(mongoose._types['array']);
    assert.ok(mongoose._types['boolean']);
    assert.ok(mongoose._types['date']);
    
  },
  
  'test string type definition': function(){
    var mongoose = require('../'),
        type = mongoose.type,
        str = type('string');
        
    assert.ok(str.type == 'string');
    assert.ok(str.setters.length == 1);
    assert.ok(str.setters[0](4) === '4');
    assert.ok(str instanceof TypeSchema);
  },
  
  'test extending types via type reference': function(){
    var mongoose = require('../'),
        type = mongoose.type,
        str = type('string'),
        email = type('email')
          .extend(str)
          .validate('email',function(val,complete){
            return complete( /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value) );
          });
    
    assert.equal(email.setters.length, 1);
    assert.ok(email.parent == 'string');
    assert.ok(typeof email.validators['email'] == 'function');
    
  },
  'test extending types via type name reference': function () {
    var mongoose = require('../'),
        type = mongoose.type,
        email = type('email2')
          .extend('string')
          .validate('email',function(val,complete){
            return complete( /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value) );
          });
    
    assert.equal(email.setters.length, 1);
    assert.ok(email.parent == 'string');
    assert.ok(typeof email.validators['email'] == 'function');
  },
  
  'test extending with string': function(){
    var mongoose = require('../'),
        type = mongoose.type,
        phone = type('phone').extend('string');
    assert.ok(phone.setters.length == 1);
    assert.ok(phone.parent == 'string');
  }
  
};
