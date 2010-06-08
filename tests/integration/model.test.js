require.paths.unshift('.')
var mongoose = require('mongoose').Mongoose;

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
    }).first(function(){
      assert(john.last == 'Lock');
    });
  },
  
  'test hydration': function(){
    
  }
  
};