var assert = require('assert')
  , mongoose = require('mongoose')
  , Document = require('mongoose/document').Document;

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
    var mongoose = require('mongoose'),
        timer = timeout(mongoose);
    mongoose.connect('mongodb://localhost/' + now(), function(){
      clearTimeout(timer);
      assert.ok(mongoose.connected, 'It should connect using uri / callback signature');
      
      mongoose.disconnect(function(){
        assert.ok(!mongoose.connected);
        
        var timer = timeout(mongoose);
        mongoose.connect('mongodb://localhost/' + now(), { some: 'option' }, function(){
          clearTimeout(timer);
          assert.ok(mongoose.connected, 'It should connect using uri / options / callback signature');
          mongoose.disconnect(function(){
            assert.ok(!mongoose.connected);
          });
        });
      });
    });
  },
  
  'test connection path errors': function(){
      try{
        mongoose.connect('localhost/db');
      } catch(e){
        assert.ok(/include the mongodb/.test(e.message));
      }
      
      try{
        mongoose.connect('mongodb:///db')
      } catch(e){
        assert.ok(/provide a hostname/.test(e.message));
      }
      
      try{
        mongoose.connect('mongodb://localhost/')
      } catch(e){
        assert.ok(/provide a database/.test(e.message));       
      }
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
    assert.ok(instance instanceof Document);
  },
  
  'test accessing model statics': function(){
      var model = mongoose.SingletonModel;
      assert.ok(typeof model.find == 'function');
  },
  
  'test accessing instance of model': function(){
      var model = mongoose.SingletonModel;
          instance = new model();
          
      assert.ok(typeof instance._run == 'function');
      assert.ok(typeof instance.save == 'function');
  },
  
  'test defining a model name that conflicts with an internal method': function(){
    var document = mongoose.define,
        conflict = false;
    try {
      document('disconnect')
    } catch(e){
      if (/choose/.test(e.toString())) conflict = true;
    }
    assert.ok(conflict, 'There should be a name conflict');
  }
  
};