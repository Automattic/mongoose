var assert = require('assert')
  , mongoose = require('../');

  function now(){
    return Math.round(Date.now() + Math.random() * 100);
  };

  function timeout(goose){
    return setTimeout(function(){
      assert.ok(false, 'Connection timeout');
    },5000);
  }
  
module.exports = {
  
  'test hydration': function(){
    var document = mongoose.define;
    document('SimpleUser')
      .string('name')
        .get(function(val,path,type){
          return val.toLowerCase();
        })
        .set(function(val,path,type){
          return val.toUpperCase();
        })
      .object('contact',
        document()
          .string('email')
          .string('phone')
          .string('city')
          .string('state')
          .string('zip'))
      .string('bio');
      
     mongoose.connect('mongodb://localhost/' + now(), function(){
     
       var SimpleUser = mongoose.SimpleUser;

       var instance = new SimpleUser({
         name: 'nathan',
         contact: {
           city: 'SF',
           state: 'CA'
         }
       },true);

       assert.ok(instance.hydrated('name'));
       assert.ok(instance.hydrated('contact.city'));
       assert.ok(instance.hydrated('bio') == false);

//       assert.ok(instance.__doc.name == 'NATHAN');
       assert.ok(instance.get('name') == 'nathan');

       assert.ok(instance._schema['name'].getters.length == 1);
       assert.ok(instance._schema['name'].setters.length == 2);     
     
     });  
  },
  
  'test mixin': function(){
    var document = mongoose.define;
    document('SimpleUser')
      .string('name')
        .get(function(val,path,type){
          return val.toLowerCase();
        })
        .set(function(val,path,type){
          return val.toUpperCase();
        })
      .object('contact',
        document()
          .string('email')
          .string('phone')
          .string('city')
          .string('state')
          .string('zip'))
      .string('bio');

     mongoose.connect('mongodb://localhost/' + now(), function(){

       var SimpleUser = mongoose.SimpleUser;

       var instance = new SimpleUser({
         name: 'Nathan',
         contact: {
           city: 'SF',
           state: 'CA'
         }
       });

       assert.ok(instance.hydrated('name') == false);
       assert.ok(instance.hydrated('contact.city') == false);
       assert.ok(instance.hydrated('bio') == false);
       
       assert.ok(instance._dirty['name'] == true);
       assert.ok(instance._dirty['contact.state'] == true);

       assert.ok(instance.__doc.name == 'NATHAN');
       assert.ok(instance.get('name') == 'nathan');

       assert.ok(instance._schema['name'].getters.length == 1);
       assert.ok(instance._schema['name'].setters.length == 2);     

     });  
  },
  
  'test setup functions': function(){
    var document = mongoose.define;
    document('SetupFn')
      .oid('_id');
      
    var SetupFn = mongoose.SetupFn;
    
    var instance = new SetupFn();
    assert.ok(instance._schema['id'].type == 'virtual');
  }
  
}