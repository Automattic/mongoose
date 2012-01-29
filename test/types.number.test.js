
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , SchemaNumber = mongoose.Schema.Types.Number
  , should = require('should')

/**
 * Test.
 */

module.exports = {

  'an empty string casts to null': function () {
    var n = new SchemaNumber();
    should.strictEqual(n.cast(''), null);
  },

  'a null number should castForQuery to null': function () {
    var n = new SchemaNumber();
    should.strictEqual(n.castForQuery(null), null);
  }

};
