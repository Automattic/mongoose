
/**
 * Module dependencies.
 */

var assert = require('assert')
  , start = require('./common')
  , mongoose = start.mongoose

describe('MongooseError', function(){
  describe('#formatMessage', function(){
    it('replaces {PATH}, {TYPE}, and {VALUE} correctly', function(done){
      var err = new mongoose.Error;
      var expect = 'value; path; type';
      var actual = err.formatMessage('{VALUE}; {PATH}; {TYPE}', 'path', 'type', 'value');
      assert.equal(expect, actual);
      done();
    })
  })
})
