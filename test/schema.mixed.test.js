
/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = new start.mongoose.Mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema;

describe('schematype mixed', function() {
  describe('empty object defaults (gh-1380)', function() {
    it('are interpreted as fns that return new empty objects', function(done) {
      var s = new Schema({mix: {type: Schema.Types.Mixed, default: {}}});
      var M = mongoose.model('M1', s);
      var m1 = new M;
      var m2 = new M;
      m1.mix.val = 3;
      assert.equal(m1.mix.val, 3);
      assert.equal(m2.mix.val, undefined);
      done();
    });
    it('can be forced to share the object between documents', function(done) {
      // silly but necessary for backwards compatibility
      var s = new Schema({mix: {type: Schema.Types.Mixed, default: {}, shared: true}});
      var M = mongoose.model('M2', s);
      var m1 = new M;
      var m2 = new M;
      m1.mix.val = 3;
      assert.equal(m1.mix.val, 3);
      assert.equal(m2.mix.val, 3);
      done();
    });
  });
});
