require.paths.unshift('.')
var assert = require('assert'),
    mongoose = require('mongoose').Mongoose;

mongoose.model('User', {
  properties: ['first', 'last']
});

db = mongoose.connect('mongodb://localhost/mongoose-tests')

User = db.model('User')

module.exports = {
  
  'test saving': function(){
    var john = new User();
    john.name = 'John';
    john.last = 'Lock';
    john.save();
    
    User.find({
      name: 'John'
    }).first(function(john){
      assert.ok(john);
      assert.equal(john.last, 'Lock');
    });
  },
  
  'test hydration': function(){
    
  }
  
};