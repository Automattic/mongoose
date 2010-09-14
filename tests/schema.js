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
  
  'test standard types': function(){
    var a = new Schema();
    assert.ok(typeof a.string == 'function');
    a.string('test').number('age');
    assert.ok(a.registry['test'] instanceof TypeSchema);
  }
  
};