var assert = require('assert')
  , Schema = require('../lib/mongoose/schema')
  , TypeSchema = require('../lib/mongoose/type')

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
  }
  
};