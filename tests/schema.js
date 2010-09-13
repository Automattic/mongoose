var assert = require('assert')
  , Schema = require('../lib/mongoose/schema');

module.exports = {
  
  'test simple chaining': function(){
    var a = new Schema();
    assert.ok(a.indexes({}) == a);
    assert.ok(a.setters({}) == a);
    assert.ok(a.getters({}) == a);
  }
  
};