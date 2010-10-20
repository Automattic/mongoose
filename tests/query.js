var assert = require('assert')
  , mongoose = require('mongoose')
  , document = mongoose.define;

mongoose.connect('mongodb://localhost/mongoose_integration_tests');

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



module.exports = {
  
  'test simple document insertion': function(){
    var User = mongoose.User
      , user = new User({
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
        complete();
      });
  },
  
  'test query find': function(){
    var User = mongoose.User;
    
    User.find({age: 33}).one(function(doc){
      assert.ok(doc.age == 33);
      assert.ok(doc.name.first == 'Nathan');
      complete();
    })
    
  }
  
};

var pending = Object.keys(module.exports).length;
function complete(){
  --pending || mongoose.disconnect();
};
