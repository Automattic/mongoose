require.paths.unshift('.')
var assert = require('assert'),
    mongoose = require('mongoose').Mongoose;

mongoose.model('User', {
  properties: ['first', 'last']
});

module.exports = {
  
  'test clearing records and counting': function(){
    var db = mongoose.connect('mongodb://localhost/mongoose-tests'),
        User = db.model('User');
    User.remove({}, function(){
      assert.ok(true)
      User.count({}, function(c){
        assert.equal(c, 0)
        db.close();
      });
    })
  },
  
  'test saving': function(){
    var db = mongoose.connect('mongodb://localhost/mongoose-tests_2'),
        User = db.model('User');
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
        db.close();
      });
    });
  }
  
};