
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
  .number('age')
  .bool('blocked');

var User = mongoose.User;

var tobi = new User({ name: { first: 'Tobi', last: 'ferret' }, age: 1 })
  , bandit = new User({ name: { first: 'Bandit', last: 'ferret' }, age: 4 })
  , tj = new User({ name: { first: 'TJ', last: 'Holowaychuk' }, age: 23 })
  , jane = new User({ name: { first: 'Jane', last: 'ferret' }, age: 4 });

tobi.save(function(){
  bandit.save(function(){
    tj.save(function(){
      jane.save(function(){
        saved();
      });
    });
  });
});

function saved() {
  User.find('name.last', 'ferret').notBlocked.first(function(err, user){
    console.log(user);
    User.drop(function(){
      db.close();
    });
  });
}