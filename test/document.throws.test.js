
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , should = require('should')

exports['test document throws mode fails with extra fields'] = function () {
  var db = mongoose.createConnection("mongodb://localhost/test-crash");

  // Simple schema with throws option
  var FooSchema = new mongoose.Schema({
      name: { type: String }
  }, {strict: "throw"});

  // Create the model
  var Foo = db.model('Foo', FooSchema);

  // This one shouldn't cause problems.
  var good = new Foo({name: 'bar'});

  try {
    // The extra baz field should throw and error.
    var bad = new Foo({name: 'bar', baz: 'bam'});
    throw new Error("Document did not throw with extra fields.");
  } catch (e) {
    db.close();
    // Make sure the error is the one we are expecting.
    should.strictEqual(e.message, "Field `baz` is not in schema.");
  }

}
