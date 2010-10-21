var assert = require('assert')
  , mongoose = require('../')
  , TypeSchema = mongoose.TypeSchema
  , type = mongoose.type;

module.exports = {
  
  'test types': function(){
    var str = type('string');
        
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
    var str = type('string');
        
    assert.ok(str.type == 'string');
    assert.equal('string', str.type);
    assert.length(str.setters, 1);
    assert.equal('4', str.setters[0](4));
    assert.equal('yay', str.setters[0]('yay'));
    assert.ok(str instanceof TypeSchema);
  },
  
  'test array type definition': function(){
    var arr = type('array');

    assert.equal('array', arr.type);
    assert.length(arr.setters, 2);
    assert.eql([1], arr.setters[1](1));
    assert.eql([1,2], arr.setters[1]([1,2]));
    assert.ok(arr instanceof TypeSchema);
  },
  
  'test object type definition': function(){
    var obj = type('object');
    
    assert.equal('object', obj.type);
    assert.length(obj.setters, 2);
    assert.eql({ foo: 'bar' }, obj.setters[1]({ foo: 'bar' }));
    assert.eql({}, obj.setters[1](1));
    assert.ok(obj instanceof TypeSchema);
  },
  
  'test number type definition': function(){
    var n = type('number');
    
    assert.equal('number', n.type);
    assert.length(n.setters, 1);
    assert.strictEqual(1, n.setters[0](1));
    assert.strictEqual(1.5, n.setters[0](1.5));
    assert.strictEqual(1.5, n.setters[0]('1.5'));
    assert.strictEqual(1, n.setters[0]('1'));
    assert.ok(n instanceof TypeSchema);
  },
  
  'test boolean type definition': function(){
    var bool = type('boolean');
    
    assert.equal('boolean', bool.type);
    assert.length(bool.setters, 1);
    assert.strictEqual(true, bool.setters[0]({}));
    assert.strictEqual(true, bool.setters[0](1));
    assert.strictEqual(true, bool.setters[0]('1'));
    assert.strictEqual(false, bool.setters[0](0));
    assert.ok(bool instanceof TypeSchema);
  },
  
  'test date type definition': function(){
    var date = type('date');
    
    assert.equal('date', date.type);
    assert.length(date.setters, 1);
    assert.eql(new Date('may 25 1987'), date.setters[0]('may 25 1987'));
    assert.eql(new Date('may 25 1987'), date.setters[0](new Date('may 25 1987')));
    assert.isUndefined(date.setters[0]('asdfadsfasdf'));
    assert.ok(date.setters[0](new Date) instanceof Date);
    assert.ok(date instanceof TypeSchema);
  },
  
  'test oid type definition': function(){
    var oid = type('oid');

    assert.equal('oid', oid.type);
    assert.length(oid.setters, 1);
    assert.ok(oid.setters[0]('4cbf63b7ed2797e92f000007') instanceof mongoose.ObjectID);
    assert.ok(oid.setters[0]() instanceof mongoose.ObjectID);
    assert.ok(oid instanceof TypeSchema);
  },
  
  'test extending types': function(){
    var str = type('string')
    , email = type('email')
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
    var phone = type('phone').extend('string');
    assert.ok(phone.setters.length == 1);
    assert.ok(phone.parent == 'string');
  }
  
};
