var assert = require('assert')
  , mongoose = require('mongoose')
  , document = mongoose.define;

mongoose.connect('mongodb://localhost/mongoose_integration_tests');

document('DocTest')
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
  
  'test documention generation': function(){
    mongoose.documentation('DocTest', __dirname+'/temp');
    complete();
  }

  
  
};

var pending = Object.keys(module.exports).length;
function complete(){
  --pending || mongoose.disconnect();
};