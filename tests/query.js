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
  'test simple document insertion': function(assert, done){
    var user = new User({
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
      
    user.save(function(){
      done();
    });
  },
  
  'test query find': function(assert, done){
    User.find({age: 33}).one(function(doc){
      // assert.ok(doc.age == 33);
      // assert.ok(doc.name.first == 'Nathan');
      // done();
    });
  },
  
  teardown: function(){
    db.close();
  }
};