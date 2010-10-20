var assert = require('assert')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , TypeSchema = mongoose.TypeSchema;
  
module.exports = {
  
  'test simple chaining': function(){
    var a = new Schema();
    assert.ok(a.indexes({}) == a);
    assert.ok(a.setters({}) == a);
    assert.ok(a.getters({}) == a);
  },
  
  'test schema compilation': function(){
    var a = new Schema('Model');
    a.string('name')
        .validate(function(){
          
        })
        .get(function(){
          
        })
        .set(function(){
          
        })
      .number('age')
        .validate(function(){
          
        })
        .get(function(){
          
        })
        .index(-1)
      .object('interests', new Schema()
                            .string('title')
                            .date('created_at')
                            .object('nested', new Schema()
                                .string('property')));
    
    var paths = a.paths;
    assert.ok(paths['name'] instanceof TypeSchema);
    assert.ok(paths['age'] instanceof TypeSchema);
    assert.ok(paths['interests'] instanceof TypeSchema);
    assert.ok(a.paths['interests.title'].type == 'string');
    assert.ok(a.paths['interests.nested.property'].type == 'string');
  },
  
  'test model introspection (getters)': function(){
      var a = new Schema('Model');
      a.string('name')
          .validate(function(){
          
          })
          .get(function(){
          
          })
          .set(function(){
          
          })
        .number('age')
          .validate(function(){
          
          })
          .get(function(){
          
          })
          .index(-1)
        .object('interests', new Schema()
                              .string('title')
                              .date('created_at')
                              .object('nested', new Schema()
                                  .string('property')));
      
      assert.ok(a.name.type == 'string');
      assert.ok(a.age.type == 'number');
      assert.ok(a.interests.nested.property.type == 'string');
      
      // check model references
      a.interests.created_at
        .get(function(){
          
        });
      
      a.interests.methods({
        one: function(){}
      }).hooks({
        two: function(){}
      }).hook('two', function(){});

      assert.ok(a.paths['interests.created_at'].getters.length == 1);
      assert.ok(a.paths['interests'].options === a.interests);
      assert.ok(typeof a.interests._hooks.two == 'function');
      assert.ok(typeof a.interests._overrides.two == 'function');
      assert.ok(typeof a.interests._methods.one == 'function');
  },
  
  'test array embedded docs (arrays) accessors': function(){
    var a = new Schema('Test');
    a.string('name')
      .number('age')
      .array('friends',new Schema()
        .string('name')
        .number('age')
        .string('email'));
    
    assert.ok(a.friends.age.type == 'number');
    
  },
  
  'test internal structure': function(){
    var a = new Schema('Test');
    a.string('name')
      .number('age')
      .array('friends',new Schema()
        .string('name')
        .number('age')
        .string('email'))
      .object('contact', new Schema()
        .string('email')
        .string('phone')
        .string('city')
        .string('state')
        .string('zip'))
        
    assert.ok(a._struct.length == 4);
    assert.ok(a._struct[2] == 'friends');
    assert.ok(Array.isArray(a._struct[3]));
    assert.ok(a._struct[3].length == 2);
    assert.ok(a._struct[3][0] == 'contact');
    assert.ok(Array.isArray(a._struct[3][1]));
    assert.ok(a._struct[3][1].length == 5);
    
    assert.ok(a._embedded['friends'] instanceof Schema);
    
  },
  
  'test standard types': function(){
    var a = new Schema();
    assert.ok(typeof a.string == 'function');
    a.string('test').number('age');
    assert.ok(a.paths['test'] instanceof TypeSchema);
    assert.ok(a.paths['test'].schema === a);
    assert.ok(a.paths['test'].key == 'test');
    assert.ok(a.paths['test'].type == 'string');
  },
  
  'test pre tasks': function(){
    var a = new Schema();
    a.pre('save', function(){ });
    a.pre('remove', function(){ });
    a.pre('remove', function(){ });
    
    assert.ok(typeof a._pres == 'object');
    assert.ok(Object.keys(a._pres).length == 2);
    assert.ok(Array.isArray(a._pres.save));
    assert.ok(Array.isArray(a._pres.remove));
    assert.ok(!Array.isArray(a._pres.hydrate));
    assert.ok(a._pres.save.length == 1);
    assert.ok(a._pres.remove.length == 2);
  },
  
  'test post tasks': function(){
    var a = new Schema();
    a.post('hydrate', function(){ });
    a.post('save', function(){ });
    a.post('save', function(){ });
    
    assert.ok(typeof a._posts == 'object');
    assert.ok(Object.keys(a._posts).length == 2);
    assert.ok(Array.isArray(a._posts.hydrate));
    assert.ok(Array.isArray(a._posts.save));
    assert.ok(!Array.isArray(a._posts.remove));
    assert.ok(a._posts.hydrate.length == 1);
    assert.ok(a._posts.save.length == 2);
  },
  
  'test overrides': function(){
    var override1 = function(){
      // overrde 1
    };
    var override2 = function(){
      // override 2
    };
    var a = new Schema();
    a.hook('save', override1);
    assert.ok(typeof a._overrides == 'object');
    assert.ok(typeof a._overrides.save == 'function');
    assert.ok(a._overrides.save == override1);
        
    a.hook('save', override2);
    assert.ok(typeof a._overrides.save == 'function');
    assert.ok(a._overrides.save == override2);
  }

};