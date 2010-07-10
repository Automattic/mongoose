require.paths.unshift('.')
var assert = require('assert'),
    mongoose = require('mongoose').Mongoose,
    mongo = require('mongodb'),
    ObjectID = require('mongodb/bson/bson').ObjectID;

require('lib/tests');

mongoose.model('User', {
  properties: ['_someid', '_someother', 'first', 'last', {'nested': ['test']}]
});

module.exports = {
  
  'test clearing records and counting': function(){
    var db = mongoose.test(),
        User = db.model('User');
    var u = new User();
    u.first = 'Test';
    u.save(function(){
      User.remove({}, function(){
        User.count({}, function(c){
          assert.equal(c, 0)
          db.terminate();
        });
      });
    });
  },
  
  'test saving and hydration': function(){
    var db = mongoose.test(),
        User = db.model('User');
    var john = new User();
    john.first = 'John';
    john.last = 'Lock';
    john._someid = 'ff7d174cff9f00c9a0141c00';
    john._someother = ObjectID.createFromHexString('ff7d174cff9f00c9a0141c00');
    
    john.save(function(){
      User.find({
        last: 'Lock'
      }).first(function(john){
        assert.ok(john);
        assert.ok(john instanceof User);
        assert.ok(john._id);
        assert.ok(john._id.toHexString);
        assert.ok(john._someid.toHexString);
        assert.ok(john._someother.toHexString);
        assert.equal(john.last, 'Lock');
		assert.ok(!john.isNew);
        db.terminate();
      });
    });
  },
  
  'test finding many bypassing hydration': function(){
    var db = mongoose.test(),
        User = db.model('User'), 
        _count = 0,
        callback = function(){
          if (++_count == 2){
            User.find({}, false).all(function(res){
              assert.ok(res instanceof Array);
              assert.ok(res.length);
              assert.ok(typeof res[0] == 'object');
              assert.ok(! (res[0] instanceof User));
			  assert.ok(!john.isNew);
              db.terminate();
            });
          }
        };
        
    var john = new User();
    john.first = 'Test';
    john.last = 'Test 2';
    john.save(callback);
    
    var mark = new User();
    mark.first = 'Test';
    mark.last = 'Test 2';
    mark.save(callback);
  },
  
  'test saving and searching for nested': function(){
    var db = mongoose.test(),
        User = db.model('User');

    User.remove({}, function(){
      var john = new User();
      john.first = 'john';
      john.nested.test = 'ok';
      john.save(function(){
        User.find({ 'nested.test': 'ok' }).one(function(john){
          assert.equal(john.first, 'john');
          db.terminate();
        });
      });
    })
  },
  
  'test finding by id': function(){
    var db = mongoose.test(),
        User = db.model('User'),
        _completed = 0,
        complete = function(){
          if (++_completed == 2) db.terminate();
        };
    var john = new User();
    john.first = 'John';
    john.last = 'Lock';
    john.save(function(){

      User.findById(john._id, function(john){
        assert.equal(john.first, 'John');
		assert.ok(!john.isNew);
        complete();
      });
      
      User.findById(john._id.toHexString(), function(john){
        assert.equal(john.last, 'Lock');
		assert.ok(!john.isNew);
        complete();
      });
      
    });
  },
  
  'test isNew / removing': function(){
    var db = mongoose.test(),
        User = db.model('User');
        
    var john = new User();
    john.first = 'John';
    john.last = 'Lock';
    
    assert.ok(john.isNew);
    
    john.save(function(){
      
      assert.ok(! john.isNew);
      
      User.find({}).all(function(docs){
	    assert.ok(!john.isNew);
        assert.ok(docs.length == 1);
        john.remove(function(){
          
          User.find({}).all(function(docs){
            assert.ok(docs.length == 0);
            db.terminate();
          });
          
        });
      });
    
    });
  }
  
};