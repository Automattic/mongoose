
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , should = require('should')

exports['test document really strict mode fails with extra fields'] = function () {
  var db = mongoose.createConnection("mongodb://localhost/test-crash");

  // Simple schema that is srsly strict
  var FooSchema = new mongoose.Schema({
      name: { type: String }
  }, {srslyStrict: true});

  // Create the model
  var Foo = db.model('Foo', FooSchema);

  // This one shouldn't cause problems.
  var good = new Foo({name: 'bar'});

  try {
    // The extra baz field should throw and error.
    var bad = new Foo({name: 'bar', baz: 'bam'});
    throw new Error("Srsly strict document did not fail!");
  } catch (e) {
    db.close();
    // Make sure the error is the one we are expecting.
    should.strictEqual(e.message, "Field `baz` is not in schema.");
  }

}
