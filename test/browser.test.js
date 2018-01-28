/**
 * Module dependencies.
 */

var Document = require('../lib/browserDocument');
var Schema = require('../lib/schema');
var exec = require('child_process').exec;

/**
 * Test.
 */
describe('browser', function() {
  it('require() works with no other require calls (gh-5842)', function(done) {
    exec('node --eval "require(\'./lib/browserDocument\')"', done);
  });

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
