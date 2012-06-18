
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , MongooseNumber = mongoose.Types.Number
  , SchemaNumber = mongoose.Schema.Types.Number
  , assert = require('assert')

/**
 * Test.
 */

describe('types.number', function(){

  it('test that a mongoose number behaves and quacks like a number', function(){
    var a = new MongooseNumber(5);

    assert.ok(a instanceof Number);
    assert.ok(a instanceof MongooseNumber);
    assert.equal(a.toString(),'5');
    assert.equal(a._atomics.constructor, Object);
  })

  it('an empty string casts to null', function () {
    var n = new SchemaNumber();
    assert.strictEqual(n.cast(''), null);
  })

  it('a null number should castForQuery to null', function () {
    var n = new SchemaNumber();
    assert.strictEqual(n.castForQuery(null), null);
  })


})
