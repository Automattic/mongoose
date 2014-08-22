var start = require('../common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var co = require('co');
var assert = require('assert');

describe('document', function() {
  describe('#validate', function() {
    it('works (gh-891)', function(done) {

      co(function*() {
        var db = start();
        var schema = null;
        var called = false;

        var validate = [function(str){ called = true; return true }, 'BAM'];

        schema = new Schema({
          prop: { type: String, required: true, validate: validate },
          nick: { type: String, required: true }
        });
 
        var M = db.model('validateSchema', schema, 'gh-891');
        var m = new M({ prop: 'gh891', nick: 'validation test' });

        try {
          yield m.save();
        } catch(e) {
          assert.ok(false, e);
        }
      
        assert.equal(true, called);
        called = false;

        try {
          m = yield M.findById(m, 'nick').exec();
        } catch(e) {
          assert.ok(false, e);
        }
        assert.equal(false, called);
        m.nick = 'gh-891';

        try {
          yield m.save();
        } catch(e) {
          assert.ok(false, e);
        }
        assert.equal(false, called);
        done();
      })();
    });
  });
});
