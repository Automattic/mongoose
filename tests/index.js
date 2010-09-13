var assert = require('assert'),
    mongoose = require('../');

function now(){
  return Math.round(Date.now() + Math.random() * 100);
};

function timeout(goose){
  return setTimeout(function(){
    assert.ok(false, 'Connection timeout');
  }, 5000);
}

module.exports = {
  
  'test connecting to mongodb (uri / callback signature)': function(){
    var timer = timeout(mongoose);
    mongoose.connect('mongodb://localhost/' + now(), function(){
      clearTimeout(timer);
      assert.ok(mongoose.connected, 'Connected with uri/callback signature');
      mongoose.disconnect(function(){
        assert.ok(!mongoose.connected);
        
        var timer = timeout(mongoose);
        mongoose.connect('mongodb://localhost/' + now(), { some: 'option' }, function(){
          clearTimeout(timer);
          assert.ok(mongoose.connected, 'Connected with uri/options/callback signature');
          mongoose.disconnect(function(){
            assert.ok(!mongoose.connected);
          });
        });
      });
    });
  }
  
};