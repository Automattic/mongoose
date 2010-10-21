
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

mongoose.documentation('User', __dirname, function(err){
  if (err) throw err;
  db.close();
});