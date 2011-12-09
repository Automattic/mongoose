
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , MongooseNumber = mongoose.Types.Number
  , SchemaNumber = mongoose.Schema.Types.Number
  , should = require('should')

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
  },

  'an empty string casts to null': function () {
    var n = new SchemaNumber();
    should.strictEqual(n.cast(''), null);
  },

  'a null number should castForQuery to null': function () {
    var n = new SchemaNumber();
    should.strictEqual(n.castForQuery(null), null);
  }

};
