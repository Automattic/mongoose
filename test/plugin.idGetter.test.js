
/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema;

describe('id virtual getter', function() {
  it('should work as expected with an ObjectId', function(done) {
    var db = start();

    var schema = new Schema({});

    var S = db.model('Basic', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s._id.toString(), s.id);
      done();
    });
  });

  it('should be turned off when `id` option is set to false', function(done) {
    var db = start();

    var schema = new Schema({}, {id: false});

    var S = db.model('NoIdGetter', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s.id, undefined);
      done();
    });
  });


  it('should be turned off when the schema has a set `id` path', function(done) {
    var db = start();

    var schema = new Schema({
      id: String
    });

    var S = db.model('NoIdGetter', schema);
    S.create({ id: 'test'}, function(err, s) {
      assert.ifError(err);

      // Comparing with expected value
      assert.equal(s.id, 'test');
      done();
    });
  });
});
