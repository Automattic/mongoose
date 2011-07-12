
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , MongooseArray = mongoose.Types.Array
  , MongooseDocumentArray = mongoose.Types.DocumentArray;

/**
 * Test.
 */

module.exports = {

  'test that a mongoose array behaves and quacks like an array': function(){
    var a = new MongooseDocumentArray();

    a.should.be.an.instanceof(Array);
    a.should.be.an.instanceof(MongooseArray);
    a.should.be.an.instanceof(MongooseDocumentArray);
    Array.isArray(a).should.be.true;
    Array.isArray(a._atomics).should.be.true;
    'object'.should.eql(typeof a);

    var b = new MongooseArray([1,2,3,4]);
    'object'.should.eql(typeof b);
    Object.keys(b).length.should.equal(4);
  }

};
