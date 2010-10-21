
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

var tj = new User({ name: 'tj', age: 23 });
console.log(tj);

tj.save(function(errors){
  if (errors) throw errors[0];
  User.find({ name: 'tj' }).one(function(user){
    console.log(user);
    db.close();
  });
});
