
/**
 * Module dependencies.
 */

var mongoose = require('../lib/mongoose')
  , document = mongoose.define;

var db = mongoose.connect('mongodb://localhost/mongoose');

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

var tobi = new User({ name: { first: 'Tobi', last: 'ferret' }, age: 1 })
  , bandit = new User({ name: { first: 'Bandit', last: 'ferret' }, age: 4 })
  , tj = new User({ name: { first: 'TJ', last: 'Holowaychuk' }, age: 3 });

tobi.save(function(){
  bandit.save(function(){
    tj.save(function(){
      User.find({ 'name.last': 'ferret' }).all(function(users){
        console.log(users);
        // Remove them all
        User.remove({}, function(){
          db.close();
        });
      });
    });
  });
});
