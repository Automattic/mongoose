var assert = require('assert')
  , mongoose = require('mongoose')
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
    var str = type('string')
      , cast = str._castSet;
        
    assert.equal('string', str.type);
    assert.length(str.setters, 0);
    assert.equal('4', cast(4));
    assert.equal('yay', cast('yay'));

    assert.equal(Error, cast({}));
    assert.equal(Error, cast([]));
    assert.equal(Error, cast());

    assert.ok(str instanceof TypeSchema);
  },
  
  'test strict string type definition': function(){
    var str = type('string').strict()
      , set = str.strictSetters[0];
        
    assert.length(str.strictSetters, 1);
    assert.equal(Error, set(4));
    assert.equal('yay', set('yay'));

    assert.equal(Error, set({}));
    assert.equal(Error, set([]));
    assert.equal(Error, set());

    assert.ok(str instanceof TypeSchema);
    str.strict(false);
  },
  
  'test array type definition': function(){
    var arr = type('array')
      , set = arr.setters[0];

    assert.equal('array', arr.type);
    assert.length(arr.setters, 1);
    assert.eql([1], set(1));
    assert.eql([1,2], set([1,2]));
    assert.ok(arr instanceof TypeSchema);
  },
  
  'test strict array type definition': function(){
    var arr = type('array').strict()
      , set = arr.strictSetters[0];

    assert.length(arr.setters, 1);
    assert.equal(Error, set(1));
    assert.eql([1,2], set([1,2]));
    assert.ok(arr instanceof TypeSchema);
  },
  
  'test object type definition': function(){
    var obj = type('object');
    
    assert.equal('object', obj.type);
    assert.length(obj.setters, 1);
    assert.eql({ foo: 'bar' }, obj.setters[0]({ foo: 'bar' }));
    assert.eql({}, obj.setters[0](1));
    assert.ok(obj instanceof TypeSchema);
  },
  
  'test strict object type definition': function(){
    var obj = type('object').strict()
      , set = obj.strictSetters[0];
    
    assert.length(obj.setters, 1);
    assert.eql({ foo: 'bar' }, set({ foo: 'bar' }));

    assert.equal(Error, set([1,2]));
    assert.equal(Error, set());
    assert.equal(Error, set(null));
    assert.equal(Error, set(NaN));
    assert.equal(Error, set('asdf'));
    assert.equal(Error, set(/foo/));

    assert.ok(obj instanceof TypeSchema);
  },
  
  'test number type definition': function(){
    var n = type('number')
      , cast = n._castSet;
    
    assert.equal('number', n.type);
    assert.length(n.setters, 0);
    assert.strictEqual(1, cast(1));
    assert.strictEqual(1.5, cast(1.5));
    assert.strictEqual(1.5, cast('1.5'));
    assert.strictEqual(1, cast('1'));
    assert.equal(Error, cast('asdf'));
    assert.equal(Error, cast({}));
    assert.equal(Error, cast());
    assert.ok(n instanceof TypeSchema);
  },
  
  'test strict number type definition': function(){
    var n = type('number').strict()
      , set = n.strictSetters[0];
    
    assert.length(n.strictSetters, 1);
    assert.strictEqual(1, set(1));
    assert.strictEqual(1.5, set(1.5));
    assert.equal(Error, set('1.5'));
    assert.equal(Error, set('1'));
    assert.equal(Error, set('asdf'));
    assert.ok(n instanceof TypeSchema);
  },
  
  'test boolean type definition': function(){
    var bool = type('boolean')
      , cast = bool._castSet;
    
    assert.equal('boolean', bool.type);
    assert.length(bool.setters, 0);
    assert.strictEqual(true, cast({}));
    assert.strictEqual(true, cast(1));
    assert.strictEqual(true, cast(true));
    assert.strictEqual(true, cast('1'));
    assert.strictEqual(false, cast(0));
    assert.strictEqual(false, cast(false));
    assert.ok(bool instanceof TypeSchema);
  },
  
  'test strict boolean type definition': function(){
    var bool = type('boolean').strict()
      , set = bool.strictSetters[0];
    
    assert.length(bool.strictSetters, 1);

    assert.equal(Error, set({}));
    assert.equal(Error, set(1));
    assert.equal(Error, set('1'));
    assert.equal(Error, set(0));
    assert.strictEqual(true, set(true));
    assert.strictEqual(false, set(false));

    assert.ok(bool instanceof TypeSchema);
  },
  
  'test date type definition': function(){
    var date = type('date'),
        cast = date._castSet;
    
    assert.equal('date', date.type);
    assert.length(date.setters, 0);
    assert.eql(new Date('may 25 1987'), cast('may 25 1987'));
    assert.eql(new Date('may 25 1987'), cast(new Date('may 25 1987')));
    assert.equal(Error, cast('asdfadsfasdf'));
    assert.ok(cast(new Date) instanceof Date);
    assert.ok(date instanceof TypeSchema);
  },
  
  'test strict date type definition': function(){
    var date = type('date').strict()
      , set = date.strictSetters[0];
    
    assert.length(date.strictSetters, 1);
    assert.equal(Error, set('may 25 1987'));
    assert.eql(new Date('may 25 1987'), set(new Date('may 25 1987')));
    assert.equal(Error, set('asdfadsfasdf'));
    assert.ok(set(new Date) instanceof Date);
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
    
    assert.ok(email.setters.length == 0);
    assert.ok(email.parent == 'string');
    assert.ok(typeof email.validators['email'] == 'function');
  },
  
  'test extending with string': function(){
    var phone = type('phone').extend('string');
    assert.ok(phone.setters.length == 0);
    assert.ok(phone.parent == 'string');
  },
  
  'test required()': function(){
    var str = type('string');
    assert.equal(undefined, str._required);
    assert.equal(str, str.required());
    assert.equal(true, str._required);
    assert.equal(str, str.required(false));
    assert.equal(false, str._required);
    assert.equal(str, str.required(true));
    assert.equal(true, str._required);
  },
  
  'test strict()': function(){
    var str = type('string');
    assert.equal(false, str._strict);
    assert.equal(str, str.strict());
    assert.equal(true, str._strict);
    assert.equal(str, str.strict(false));
    assert.equal(false, str._strict);
    assert.equal(str, str.strict(true));
    assert.equal(true, str._strict);
  }
  
};
