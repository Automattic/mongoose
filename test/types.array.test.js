
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , MongooseArray = mongoose.Types.Array;

/**
 * Test.
 */

module.exports = {

  'test that a mongoose array behaves and quacks like an array': function(){
    var a = new MongooseArray();

    a.should.be.an.instanceof(Array);
    a.should.be.an.instanceof(MongooseArray);
    Array.isArray(a).should.be.true;
    (a._atomics.constructor).should.eql(Object);
  }

};
