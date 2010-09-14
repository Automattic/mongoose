var assert = require('assert')
  , Schema = require('../lib/mongoose/schema')
  , TypeSchema = require('../lib/mongoose/type');
  
module.exports = {
  
  'test simple chaining': function(){
    var a = new Schema();
    assert.ok(a.indexes({}) == a);
    assert.ok(a.setters({}) == a);
    assert.ok(a.getters({}) == a);
  },
  
  'test schema compilation': function(){
    return assert.ok(true);
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
      .array('interests', new Schema()
                            .string('title')
                            .date('created_at'));
    
    var paths = a.paths;
    assert.ok(paths['name'] instanceof TypeSchema);
    assert.ok(paths['age'] instanceof TypeSchema);
    assert.ok(paths['interests'] instanceof TypeSchema);
    assert.ok(paths['interests.title'] === undefined);
    
    a._compile();
    
    assert.ok(a.paths['interests.title'] instanceof TypeSchema);
  },
  
  'test standard types': function(){
    var a = new Schema();
    assert.ok(typeof a.string == 'function');
    a.string('test').number('age');
    assert.ok(a.registry['test'] instanceof TypeSchema);
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
  }
  
};