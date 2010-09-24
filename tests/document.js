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
       
       assert.ok(instance._.dirty['name'] == true);
       assert.ok(instance._.dirty['contact.state'] == true);

       assert.ok(instance._.doc.name == 'NATHAN');
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
  },
  
  'test isNew flag': function(){
    var SimpleUser = mongoose.SimpleUser;
    
    var user = new SimpleUser({name: 'Nate'}); 
    assert.ok(user.isNew == true);
    
    var user = new SimpleUser({name: 'Nathan'}, true);
    assert.ok(user.isNew == false); 
  },
  
  'test hydrated()': function(){
    var User = mongoose.SimpleUser;
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user.hydrated('name') == true);
    assert.ok(user.hydrated('contact.city') == true);
    assert.ok(user.hydrated('contact.state') == false);
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    });
    
    assert.ok(user.hydrated('name') == false);
    assert.ok(user.hydrated('contact.city') == false);
    assert.ok(user.hydrated('contact.state') == false);    
  },

  'test isDirty()': function(){
    var User = mongoose.SimpleUser;
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user.isDirty('name') == false);
    assert.ok(user.isDirty('contact.city') == false);
    assert.ok(user.isDirty('contact.state') == false);
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    });
    
    assert.ok(user.isDirty('name') == true);
    assert.ok(user.isDirty('contact.city') == true);
    assert.ok(user.isDirty('contact.state') == false);    
  },
  
  'test interal doc value when initialized': function(){
    var User = mongoose.SimpleUser;
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user._.doc.name == 'Nathan');
    assert.ok(user._.doc.contact.city == 'SF');
    assert.ok(user._.doc.contact.state == undefined);
    
    var user = new User({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    });
    
    assert.ok(user._.doc.name == 'NATHAN');
    assert.ok(user._.doc.contact.city == 'SF');
    assert.ok(user._.doc.contact.state == undefined);    
  },
  
  'test getters/setters': function(){
    var User = mongoose.SimpleUser;
    
    var user = new User();
    user.set('name', 'Nathan');
    user.set('contact.city', 'SF');
    
    assert.ok(user.get('name') == 'nathan');
    assert.ok(user._.doc.name == 'NATHAN');
    assert.ok(user.get('contact.city') == 'SF');
    assert.ok(user.isDirty('name') == true);
    assert.ok(user.isDirty('contact.city') == true);
    assert.ok(Object.keys(user._.doc).length == 2);
    assert.ok(Object.keys(user._.doc.contact).length == 1);
  },
  
  'test dot notation getters/setters': function(){
    var User = mongoose.SimpleUser;
    
    var user = new User();
    user.name = 'Nathan';
    user.contact.city = 'SF';
    
    assert.ok(user.name == 'nathan');
    assert.ok(user._.doc.name == 'NATHAN');
    assert.ok(user.contact.city == 'SF');
    assert.ok(user.isDirty('name') == true);
    assert.ok(user.isDirty('contact.city') == true);
    assert.ok(Object.keys(user._.doc).length == 2);
    assert.ok(Object.keys(user._.doc.contact).length == 1);
  },
  
  'test deep nested structures': function(){
    var document = mongoose.define;
    document('SuperNested')
      .string('something')
      .object('super', document()
        .object('deep', document()
          .object('nested', document()
            .string('property'))));
            
    var SuperNested = mongoose.SuperNested;
    
    var nested = new SuperNested();
    
    assert.ok(Object.keys(nested._.doc).length == 0);
    
    nested.super.deep.nested.property = 'cool';
    assert.ok(Object.keys(nested._.doc).length == 1);
    assert.ok(nested.get('super.deep.nested.property') == 'cool');
    assert.ok(nested._.doc.super.deep.nested.property == 'cool');
    
  },
  
  'test virtuals': function(){
    var document = mongoose.define;
    document('VirtualTest')
      .string('first')
      .string('last')
      .virtual('full_name')
        .get(function(){
          return this.first + ' ' + this.last;
        })
        .set(function(val){
          return this.nested.control =  val;
        })
      .object('nested', document()
        .string('control')
        .virtual('test')
          .get(function(){
            return this.last + ' ' + this.first;
          })
      );
        
    var Virt = mongoose.VirtualTest;
    
    var virtual = new Virt();
    assert.ok(Object.keys(virtual._.doc).length == 0);
    virtual.first = 'Nathan';
    virtual.last = 'White';
    assert.ok(virtual._.doc.last == 'White');
    assert.ok(virtual.full_name == 'Nathan White');
    virtual.full_name = 'bizarre';
    assert.ok(virtual.nested.control == 'bizarre');
    assert.ok(Object.keys(virtual._.dirty).length == 3);
    assert.ok(virtual.nested.test == 'White Nathan');
  },
  
  'test custom methods': function(){
    var document = mongoose.define;
    document('CustomHelpers')
      .string('lang')
      .method('getLang', function(){
        return this.lang;
      })
      .static('getSchema', function(){
        return this.prototype._schema;
      });
    
    var CH = mongoose.CustomHelpers;
    
    var ch = new CH({lang: 'javascript'});
    assert.ok(typeof ch.getLang == 'function');
    assert.ok(ch.getLang() == 'javascript');
  },
  
  'test custom static methods': function(){
    var CH = mongoose.CustomHelpers;
    
    assert.ok(typeof CH.getSchema == 'function');
    assert.ok(CH.getSchema().paths['lang'].type == 'string');    
  },
  
  'augmenting compiled schemas': function(){
    var document = mongoose.define;
    document('CustomHelpers')
      .method('randomMethod', function(lang){
        return 'yawn';
      });

      var CH = mongoose.CustomHelpers;
      var ch = new CH({lang: 'javascript'});
      assert.ok(typeof ch.randomMethod != 'function');
  },
  
}