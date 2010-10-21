
var assert = require('assert')
  , mongoose = require('../')
  , document = mongoose.define
  , db = mongoose.connect('mongodb://localhost/mongoose_document_tests');

// Setup
document('SimpleUser')
  .oid('_id')
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
var SimpleUser = mongoose.SimpleUser;
SimpleUser.remove({}, function (err) {
  console.log(err);
});

module.exports = {

  'test saved objects should be found': function () {
    var instance = new SimpleUser({
      name: 'brian',
      contact: {
        city: 'SF',
        state: 'CA'
      }
    });
    instance.save( function (err, record) {
      assert.ok(typeof record.id !== "undefined");
      SimpleUser.findById(record.id, function (found) {
        assert.ok(found.id === record.id);
      });
    });
  },

  'test hydration': function(){
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
     
     assert.ok(instance.get('name') == 'nathan');

     assert.ok(instance._schema['name'].getters.length == 1);
     assert.ok(instance._schema['name'].setters.length == 2);     
  },
  
  'test mixin': function(){
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
  },
  
  'test setup functions': function(){
    var document = mongoose.define;
    document('SetupFn')
      .oid('_id');
      
    var SetupFn = mongoose.SetupFn;
    
    var instance = new SetupFn();
    assert.ok(instance._schema['id'].type == 'virtual');
  },
  
  'test default property setting': function(){
      var SetupFn = mongoose.SetupFn;
      
      var instance = new SetupFn();
      assert.ok(instance.isDirty('_id') == true);
      assert.ok(instance._id.toHexString() == instance.id);
  },
  
  'test defaults with hydration': function(){
    var SetupFn = mongoose.SetupFn;
    
    var instance = new SetupFn({},true);

    assert.ok(instance.isDirty('_id') == false);
    assert.ok(instance._id == undefined);
  },
  
  'test isNew flag': function(){
    var user = new SimpleUser({name: 'Nate'}); 
    assert.ok(user.isNew == true);
    
    var user = new SimpleUser({name: 'Nathan'}, true);
    assert.ok(user.isNew == false);
  },
  
  'test hydrated()': function(){
    var user = new SimpleUser({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user.hydrated('name') == true);
    assert.ok(user.hydrated('contact.city') == true);
    assert.ok(user.hydrated('contact.state') == false);
    
    var user = new SimpleUser({
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
    var user = new SimpleUser({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user.isDirty('name') == false);
    assert.ok(user.isDirty('contact.city') == false);
    assert.ok(user.isDirty('contact.state') == false);
    
    var user = new SimpleUser({
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
    var user = new SimpleUser({
      name: 'Nathan',
      contact: {
        city: 'SF'
      }
    }, true);
    
    assert.ok(user._.doc.name == 'Nathan');
    assert.ok(user._.doc.contact.city == 'SF');
    assert.ok(user._.doc.contact.state == undefined);
    
    var user = new SimpleUser({
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
    var user = new SimpleUser();
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
    var user = new SimpleUser();
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

  'test pre hooks': function(){
    var document = mongoose.define;
    var total = 0;
    document('PreHooks')
      .string('test')
      .pre('hydrate', function(callback){
        total++;
        callback();
      })
      .pre('hydrate', function(callback){
        total++;
        callback();
      });
     
    var PreHooks = mongoose.PreHooks;
    
    var ph = new PreHooks({test: 'hi'},true);
    assert.ok(ph._.doc.test == 'hi');
    assert.ok(total == 2);
  },
  
  'test override': function(){
    var document = mongoose.define;
    var total = 0;
    document('OverHooks')
      .string('test')
      .hook('init', function(parent, callback, obj){
         total++;
         assert.ok(total == 1);
         parent(callback, obj);
       })
     
    var OverHooks = mongoose.OverHooks;
    
    var ph = new OverHooks({test: 'hi'},true);
    assert.ok(ph._.doc.test == 'hi');
    assert.ok(total == 1);
  },
  
  'testing post hooks': function(){
    var document = mongoose.define;
    var total = 0;
    document('PostHooks')
      .string('test')
      .post('hydrate', function(){
        total++;
      })
      .post('hydrate', function(){
        total++;
      });
     
    var PostHooks = mongoose.PostHooks;
    
    var ph = new PostHooks({test: 'hi'},true);
    assert.ok(ph._.doc.test == 'hi');
    assert.ok(total == 2);
  },
  
  'test pre/override/post hooks together': function(){
    var document = mongoose.define;
    var total = 0;
    document('AllHooks')
      .string('test')
       .pre('hydrate', function(callback){
        total++;
        assert.ok(total == 1);
        callback();
      })
      .pre('hydrate', function(callback){
        total++;
        assert.ok(total == 2);
        callback();
      })
     .hook('init', function(parent, callback, obj){
        total++;
        assert.ok(total == 3);
        parent(callback, obj);
      })
      .post('hydrate', function(){
        total++;
        assert.ok(total == 4);
      })
      .post('hydrate', function(){
        total++;
        assert.ok(total == 5);
      });
     
    var AllHooks = mongoose.AllHooks;
    
    var ah = new AllHooks({test: 'hi'},true);
    assert.ok(ah._.doc.test == 'hi');
    assert.ok(total == 5);
  },
  
  'test hydration w/ arrays': function(){
    var document = mongoose.define;

    document('ArrayFun')
    .oid('_id')
    .string('name')
    .array('test');
  
    var ArrayFun = mongoose.ArrayFun;
        
    var af = new ArrayFun({
      name: 'nate',
      test: [1,2,3]
    }, true);
    
    assert.ok(af.test.length == 3);
    assert.ok(af.test.get(1) == 2);
    af.test.set(1,5);
    assert.ok(Array.isArray(af._.dirty['test']));
    assert.ok(af._.dirty['test'][0] == 1);
    assert.ok(af.test.get(1) == 5);
    assert.ok(af._.doc.test[1] == 5);
  },
  
  'test creation w/ arrays': function(){
      var ArrayFun = mongoose.ArrayFun;
    
      var af = new ArrayFun({
        name: 'nate',
        test: [1,2,3]
      });
      
      assert.ok(af.test.length == 3);
      assert.ok(af.test.get(1) == 2);
      af.test.set(1,5);
      assert.ok(Array.isArray(af._.dirty['test']));
      assert.ok(af._.dirty['test'][0] == 1);
      assert.ok(af.test.get(1) == 5);
      assert.ok(af._.doc.test[1] == 5);
  },
  
  'test embeddedArray': function(){
    var ArrayFun = mongoose.ArrayFun;
  
    var af = new ArrayFun({
      name: 'nate',
      test: [1,2,3]
    });
    
    assert.ok(af.test.length == 3);
    af.test.forEach(function(val,idx){
      assert.ok(val == idx+1);
    });
    
    af.test.push(4,5);
    assert.ok(af.test.length == 5);
    assert.ok(af._.doc.test[3] == 4);
//    assert.ok(af._.dirty('test'));
  },
  
  'test validators': function(assert, done){
    var document = mongoose.define;

    var VT = document('ValidTests')
    .oid('_id')
    .string('email')
    .number('age');
    
    VT.age.validate('qualify_for_medicare', function(value, cb){
      cb(value >= 55); 
    });
    
    VT.email.validate('isEmail', function(value, cb){
      cb( (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value)) );
    });
    
    VT.hook('save', function(parent, callback){
      assert.ok(this._.errors.length == 2);
      parent(callback);
    });
  
    var ValidTests = mongoose.ValidTests;
        
    var af = new ValidTests({
      email: 'email',
      age: 33
    });
    
    af.save(function(err, doc){
      assert.ok(err.length == 2);
      done();
    });
  },
  
  'test plugins': function(assert, done){
    var document = mongoose.define;
    
    var PT = document('PluginTest')
        .plugin(function(doc,options){
          if(typeof options != 'object') return;
          for(prop in options){
            if(doc[options[prop]]){
              doc[options[prop]](prop);
            }  
          }
        },{ name: 'string', age: 'number', invalid: 'crap'})
        
        .plugin(function(doc){
          doc.virtual('virtual')
            .get(function(){
              return 'virtual key';
            });
        })
        
        .plugin(function(doc){
          if(doc.paths['age'] && doc.paths['age'].type == 'number'){
            doc.age.validate('isAdult', function(val,cb){
              cb(this.age >= 18);
            });
          } 
          doc.hook('save', function(parent, callback){
            if(this.age >= 18) assert.ok(this._.errors.length == 0);
            else assert.ok(this._.errors.length == 1);
            if(callback) callback(this._.errors, this);
          });
        })
                
    var PluginTest = mongoose.PluginTest;
    
    assert.ok(PluginTest.prototype._schema);
    assert.ok(PluginTest.prototype._schema.paths['age'].type == 'number');
    assert.ok(PluginTest.prototype._schema.paths['name'].type == 'string');
    
    var pt = new PluginTest({
      name: 'Nate',
      age: 33
    });
    
    assert.ok(pt._.doc.name == 'Nate');
    assert.ok(pt._.doc.age == 33);
    assert.ok(pt.name == 'Nate');
    assert.ok(pt.virtual == 'virtual key');
    
    pt.save(function(err, doc){
      assert.ok(doc == pt);
      assert.ok(err.length == false);
    });
    
    var pt2 = new PluginTest({
      name: 'jimmy',
      age: 15
    });
    
    assert.ok(pt2.age == 15);
    
    pt2.save(function(err, doc){
      assert.ok(Array.isArray(err) == true);
      assert.ok(err.length == 1);
      assert.ok(err[0].type == 'validation');
      assert.ok(err[0].name == 'isAdult');
      done();
    });  
  },
  
  'test Array casting': function(){
    var document = mongoose.define;
    var AC = 
      document('ArrayCast')
        .array('ids', 'oid');
    
    var ArrayCast = mongoose.ArrayCast;
    
    var ac = new ArrayCast({ids: ['4cbe1be90b2f4fc77e000004'] });
    assert.ok(ac.ids.get(0).toHexString() == '4cbe1be90b2f4fc77e000004');
    ac.ids.push('4cbe1be90b2f4fc77e000004');
    assert.ok(ac.ids.get(1).toHexString() == '4cbe1be90b2f4fc77e000004');
    ac.ids.push(null);
    assert.ok(ac.ids.length == 3);
    assert.ok(ac.ids.get(2).toHexString());
  },
  
  'test Embedded Documents': function(){
    var document = mongoose.define;
    
    var EDT = 
      document('EmbeddedDocTest')
        .string('test')
        .array('notes', 
          document()
            .string('note')
            .date('date'));
            
    var EmbeddedDocTest = mongoose.EmbeddedDocTest;
  
    var edt = new EmbeddedDocTest({
      test: 'me',
      notes: [{note: 'hi', date: new Date()}] 
    });
  
    assert.ok(edt.notes[0].note == 'hi');
    edt.notes.push({note: 'bye', date: new Date()});
    assert.ok(edt.notes[1].note == 'bye');
  },
  
  'test invalid type coercion': function(assert, done){
    mongoose.define('Animal')
      .string('name').strict()
      .number('age');
    var Animal = mongoose.Animal;
    var tobi = new Animal({ name: { foo: 'bar' }, age: '23' });
    tobi.save(function(errors){
      assert.length(errors, 1);
      assert.equal('failed to cast name value of {"foo":"bar"} to string', errors[0].message);
      tobi.name = 'Tobi';
      tobi.save(function(errors){
        assert.ok(!errors);
        done();
      });
    });
  },
  
  teardown: function(){
    db.close();
  }

};
