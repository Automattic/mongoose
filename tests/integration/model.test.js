require.paths.unshift('.')
var assert = require('assert'),
    mongoose = require('mongoose').Mongoose;

mongoose.model('User', {
  properties: ['first', 'last']
});

db = mongoose.connect('mongodb://localhost/mongoose-tests')

User = db.model('User')

module.exports = {
  
  'test clearing records and counting': function(){
    User.remove({}, function(){
      assert.ok(true)
      User.count({}, function(c){
        assert.equal(c, 0)
      });
    })
  },
  
  'test saving': function(){
    var john = new User();
    john.first = 'John';
    john.last = 'Lock';
    john.save(function(){
      assert.ok(true);
      User.find({
        first: 'John'
      }).first(function(john){
        assert.ok(john);
        assert.equal(john.last, 'Lock');
      });
    });
  }
  
};