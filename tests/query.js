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
  .number('age').default(1)
  .bool('blocked')
  .bool('awesome').default(true)
  .array('roles');
  
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
      roles: ['admin'],
      age: 33
    });
    
    var tj = new User({
      name: {
          first: 'TJ'
        , last: 'Holowaychuk'
      },
      roles: ['admin'],
      blocked: true
    });
    
    var tobi = new User({
      awesome: false,
      name: {
          first: 'Tobi'
        , last: 'Holowaychuk'
      },
      roles: ['ferret', 'pet']
    });
    
    var raul = new User({
      awesome: false,
      name: {
          first: 'Raul'
        , last: 'Rauch'
      },
      roles: ['dog', 'pet']
    });
      
    nathan.save(function(errors){
      assert.ok(!errors);
      tj.save(function(errors){
        assert.ok(!errors);
        tobi.save(function(errors){
          assert.ok(!errors);
          raul.save(function(errors){
            assert.ok(!errors);
            done();
          })
        });
      });
    });
    
  },
  
  'test all()': function(assert, done){
    User.all(function(docs){
      assert.length(docs, 4);
      done();
    });
  },
  
  'test first()': function(assert, done){
    User.first().all(function(docs){
      assert.length(docs, 1);
      done();
    });
  },
  
  'test first(n)': function(assert, done){
    User.first(2).all(function(docs){
      assert.length(docs, 2);
      assert.equal(1, docs[1].age);
      done();
    });
  },
  
  'test first(fn)': function(assert, done){
    User.first(function(doc){
      assert.equal('Nathan', doc.name.first);
      done();
    });
  },
  
  'test first(n, fn)': function(assert, done){
    User.first(2, function(docs){
      assert.length(docs, 2);
      done();
    });
  },
  
  'test find()/one()': function(assert, done){
    User.find({ 'name.last': 'Holowaychuk' }).one(function(doc){
      assert.equal('TJ', doc.name.first);
      done();
    })
  },
  
  'test find(key, true)': function(assert, done){
    User.find('awesome', true).all(function(docs){
      assert.length(docs, 2);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('TJ', docs[1].name.first);
      done();
    });
  },
  
  'test find(key) boolean true': function(assert, done){
    User.find('awesome').all(function(docs){
      assert.length(docs, 2);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('TJ', docs[1].name.first);
      done();
    });
  },
  
  'test .key boolean getter': function(assert, done){
    User.awesome.all(function(docs){
      assert.length(docs, 2);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('TJ', docs[1].name.first);
      User.notAwesome.all(function(docs){
        assert.length(docs, 2);
        assert.equal('Tobi', docs[0].name.first);
        assert.equal('Raul', docs[1].name.first);
        done();
      });
    });
  },
  
  'test .key / not<key> boolean getter chaining': function(assert, done){
    User.notBlocked.awesome.all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      done();
    });
  },
  
  'test find(key, true)': function(assert, done){
    User.find('awesome', false).all(function(docs){
      assert.length(docs, 2);
      assert.equal('Tobi', docs[0].name.first);
      assert.equal('Raul', docs[1].name.first);
      done();
    });
  },
  
  'test find() partial select': function(assert, done){
    User.find({ 'name.first': 'Nathan' }, { name: true }).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      assert.isUndefined(docs[0].age);
      assert.eql({}, docs[0].contact);
      done();
    });
  },
  
  'test find() partial select with several fields': function(assert, done){
    User.find({ 'name.first': 'Nathan' }, { name: true, age: true }).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal(33, docs[0].age);
      assert.eql({}, docs[0].contact);
      done();
    });
  },
  
  'test find() partial select field omission': function(assert, done){
    User.find({ 'name.first': 'Nathan' }, { contact: false }).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal(33, docs[0].age);
      assert.eql({}, docs[0].contact);
      done();
    });
  },
  
  'test find() partial select field omission': function(assert, done){
    User.find({ 'name.first': 'Nathan' }, 'name').all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      assert.isUndefined(docs[0].age);
      assert.eql({}, docs[0].contact);
      done();
    });
  },
  
  'test find() $nin': function(assert, done){
    User.find({ roles: { $nin: ['pet'] }}).all(function(docs){
      assert.length(docs, 2);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('TJ', docs[1].name.first);
      done();
    })
  },
  
  'test find() $in': function(assert, done){
    User.find({ roles: { $in: ['admin'] }}).all(function(docs){
      assert.length(docs, 2);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('TJ', docs[1].name.first);
      done();
    })
  },
  
  'test find() $in multiple values': function(assert, done){
    User.find({ roles: { $in: ['admin', 'pet'] }}).all(function(docs){
      assert.length(docs, 4);
      done();
    })
  },
  
  'test find() $all': function(assert, done){
    User.find({ roles: { $all: ['pet', 'dog'] }}).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Raul', docs[0].name.first);
      done();
    })
  },
  
  'test find()/all() query with one condition': function(assert, done){
    User.find({age:33}).all(function(docs){
      assert.length(docs, 1);
      assert.equal('Nathan', docs[0].name.first);
      assert.equal('nathan@learnboost.com', docs[0].contact.email);
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
  
  'test find(key,val) chaining': function(assert, done){
    User
      .find('name.last', 'Holowaychuk')
      .find('name.first', 'TJ')
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
  
  'test several kickers': function(assert, done){
    var n = 2
      , a = 0
      , b = 0;
    User
      .find({ 'name.last': 'Holowaychuk' })
      .all(function(docs){
        assert.equal(1, ++a);
        assert.length(docs, 2);
        assert.equal('TJ', docs[0].name.first);
        --n || done();
      })
      .find({ awesome: true })
      .all(function(docs){
        assert.equal(1, ++b);
        assert.length(docs, 1);
        assert.equal('TJ', docs[0].name.first);
        --n || done();
      });
  },
  
  'test where() prop': function(assert, done){
    User
      .find()
      .where({ 'name.last': 'Holowaychuk' })
      .where('name.first', 'TJ')
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
      assert.equal(4, n);
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
          assert.length(docs, 3);
          done();
        });
      });
    });
  },

  teardown: function(){
    db.close();
  }
};