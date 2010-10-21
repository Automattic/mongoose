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
    User.remove({}, done);
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
      
    nathan.save(function(errors){
      assert.ok(!errors);
      tj.save(function(errors){
        assert.ok(!errors);
        done();
      });
    });
    
  },
  
  'test find/all query with one condition': function(assert, done){
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

  teardown: function(){
    db.close();
  }
};