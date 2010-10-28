
/**
 * Module dependencies.
 */

var mongoose = require('../lib/mongoose')
  , document = mongoose.define;

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
  .number('age').strict()
  .bool('blocked');

document('Post')
  .oid('_id')
  .string('title').required()
  .string('body').required();

mongoose.documentation({
    dest: __dirname
  , title: 'User documentation'
});