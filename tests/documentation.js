var assert = require('assert')
  , fs = require('fs')
  , mongoose = require('../')
  , document = mongoose.define
  , db = mongoose.connect('mongodb://localhost/mongoose_integration_tests');

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
  
  'test documention generation': function(assert, done){
    mongoose.documentation('DocTest', __dirname, function(err){
      var mdStat = fs.statSync(__dirname + '/DocTest.md')
        , htmlStat = fs.statSync(__dirname + '/DocTest.html');
        
      assert.ok(err == null);  
      assert.ok(mdStat);
      assert.ok(htmlStat); 
      assert.ok(mdStat.size > 2000);
      assert.ok(htmlStat.size > 2000);
      fs.unlink(__dirname + '/DocTest.md');
      fs.unlink(__dirname + '/DocTest.html');
      done();
    });
  },
  
  teardown: function(){
    db.close();
  }
};
