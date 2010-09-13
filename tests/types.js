var assert = require('assert');

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
  }
  
};