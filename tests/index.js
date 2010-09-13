var assert = require('assert')
  , mongoose = require('../')
  , Model = require('../lib/mongoose/model');

function now(){
  return Math.round(Date.now() + Math.random() * 100);
};

function timeout(goose){
  return setTimeout(function(){
    assert.ok(false, 'Connection timeout');
  },5000);
}

module.exports = {
  
  'test connecting to mongodb': function(){
    var mongoose = require('../'),
        timer = timeout(mongoose);
    mongoose.connect('mongodb://localhost/' + now(), function(){
      clearTimeout(timer);
      assert.ok(mongoose.connected, 'Connected using uri / callback signature');
      
      mongoose.disconnect(function(){
        assert.ok(!mongoose.connected);
        
        var timer = timeout(mongoose);
        mongoose.connect('mongodb://localhost/' + now(), { some: 'option' }, function(){
          clearTimeout(timer);
          assert.ok(mongoose.connected, 'Connected using uri / options / callback signature');
          mongoose.disconnect();
        });
      });
    });
  },
  
  'test accessing a model from the mongoose singleton': function(){
    var document = mongoose.define;
    document('SingletonModel')
      .setters({
        'onekey': function(){},
        'twokey': function(){}
      })
      .indexes({ 'some.key': -1 });
    var instance = new mongoose.SingletonModel();
    assert.ok(instance instanceof mongoose.SingletonModel);
    assert.ok(instance instanceof Model);
  }
  
};