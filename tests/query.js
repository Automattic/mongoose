var assert = require('assert')
  , mongoose = require('mongoose')
  , document = mongoose.define
  , db = mongoose.connect('mongodb://localhost/mongoose_integration_query');

document('User')
  .oid('_id')
  .object('name',
    document()
      .string('first')
      .string('last'))
  .object('contact',
    document()
      .string('email')
      .string('phone'))
  .number('age');
  
var User = mongoose.User;

module.exports = {
  before: function(assert, done){
    User.drop(done);
  },

  'test simple document insertion': function(assert, done){
    var nathan = new User({
      name: {
        first: 'Nathan',
        last: 'White'
      },
      contact: {
        email: 'nathan@learnboost.com',
        phone: '555-555-5555'
      },
      age: 33
    });
    
    var tj = new User({
      name: {
          first: 'TJ'
        , last: 'Holowaychuk'
      }
    });
    
    var tobi = new User({
      name: {
          first: 'Tobi'
        , last: 'Holowaychuk'
      }
    });
      
    nathan.save(function(errors){
      assert.ok(!errors);
      tj.save(function(errors){
        assert.ok(!errors);
        tobi.save(function(errors){
          assert.ok(!errors);
          done();
        });
      });
    });
    
  },
  
  'test all()': function(assert, done){
    User.all(function(docs){
      assert.length(docs, 3);
      done();
    });
  },
  
  'test first()': function(assert, done){
    User.first(function(doc){
      assert.equal('Nathan', doc.name.first);
      done();
    });
  },
  
  'test first(n)': function(assert, done){
    User.first(2, function(docs){
      assert.length(docs, 2);
      done();
    });
  },
  
  'test find()/all() query with one condition': function(assert, done){
    User.find({age:33}).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      User.find({ 'name.first': 'TJ' }).all(function(docs){
        assert.length(docs, 1);
        assert.equal('TJ', docs[0].name.first);
        done();
      })
    });
  },
  
  'test find()/all() query with several conditions': function(assert, done){
    User.find({ 'name.last': 'Holowaychuk' }).all(function(docs){
      assert.length(docs, 2);
      assert.equal('TJ', docs[0].name.first);
      assert.equal('Tobi', docs[1].name.first);
      User.find({ 'name.last': 'Holowaychuk', 'name.first': 'TJ' }).all(function(docs){
        assert.length(docs, 1);
        assert.equal('TJ', docs[0].name.first);
        done();
      })
    });
  },
  
  'test find() chaining': function(assert, done){
    User
      .find({ 'name.last': 'Holowaychuk' })
      .find({ 'name.first': 'TJ' })
      .all(function(docs){
        assert.length(docs, 1);
        assert.equal('TJ', docs[0].name.first);
        done();
      });
  },
  
  'test where() alias': function(assert, done){
    User
      .find()
      .where({ 'name.last': 'Holowaychuk' })
      .where({ 'name.first': 'TJ' })
      .all(function(docs){
        assert.length(docs, 1);
        assert.equal('TJ', docs[0].name.first);
        done();
      });
  },
  
  'test find()/first() query with one condition': function(assert, done){
    User.find({ 'contact.email': 'nathan@learnboost.com' }).first(function(doc){
      assert.equal('Nathan', doc.name.first);
      done();
    });
  },
  
  'test find() given an ObjectID': function(assert, done){
    User.find({ 'name.first': 'TJ' }).all(function(docs){
      assert.length(docs, 1);
      User.find(docs[0]._id, function(doc){
        assert.equal('TJ', doc.name.first);
        var query = User.find(docs[0]._id);
        query.first(function(doc){
          assert.equal('TJ', doc.name.first);
          done();
        });
      });
    });
  },
  
  'test findById()': function(assert, done){
    User.find({ 'name.first': 'TJ' }).all(function(docs){
      assert.length(docs, 1);
      User.findById(docs[0]._id, function(doc){
        assert.equal('TJ', doc.name.first);
        done();
      });
    });
  },
  
  'test count()': function(assert, done){
    User.count(function(n){
      assert.equal(3, n);
      User.count({ 'name.last': 'White' }, function(n){
        assert.equal(1, n);
        User.count({ 'name.last': 'foobar' }, function(n){
          assert.equal(0, n);
          done();
        });
      });
    });
  },
  
  'test remove()': function(assert, done){
    User.remove({ 'name.first': 'TJ' }, function(){
      User.find({ 'name.first': 'TJ' }).all(function(docs){
        assert.length(docs, 0);
        User.find().all(function(docs){
          assert.length(docs, 2);
          done();
        });
      });
    });
  },

  teardown: function(){
    db.close();
  }
};