var assert = require('assert');

module.exports = {
  
  'test types': function(){
    var mongoose = require('../'),
        type = mongoose.type,
        str = type('string');
        
    assert.ok(typeof type == 'function');
    assert.ok(str.type == 'string');
    assert.ok(str.setters.length == 1);
  }
  
};