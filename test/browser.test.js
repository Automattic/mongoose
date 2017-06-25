/**
 * Module dependencies.
 */

var Document = require('../lib/browserDocument');
var Schema = require('../lib/schema');

/**
 * Test.
 */
describe('browser', function() {
  it('document works (gh-4987)', function(done) {
    var schema = new Schema({
      name: {type: String, required: true},
      quest: {type: String, match: /Holy Grail/i, required: true},
      favoriteColor: {type: String, enum: ['Red', 'Blue'], required: true}
    });

    new Document({}, schema);

    done();
  });
});
