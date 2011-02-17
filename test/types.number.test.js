
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , MongooseNumber = mongoose.Types.Number;

/**
 * Test.
 */

module.exports = {

  'test that a mongoose number behaves and quacks like a number': function(){
    var a = new MongooseNumber(5);

    a.should.be.an.instanceof(Number);
    a.should.be.an.instanceof(MongooseNumber);
    a.toString().should.eql('5');

    (a._atomics.constructor).should.eql(Object);
  }

};
