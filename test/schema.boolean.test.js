
/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema;

describe('schematype', function() {
  describe('boolean', function() {
    it('null default is permitted (gh-523)', function(done) {
      var db = start(),
          s1 = new Schema({b: {type: Boolean, default: null}}),
          M1 = db.model('NullDateDefaultIsAllowed1', s1),
          s2 = new Schema({b: {type: Boolean, default: false}}),
          M2 = db.model('NullDateDefaultIsAllowed2', s2),
          s3 = new Schema({b: {type: Boolean, default: true}}),
          M3 = db.model('NullDateDefaultIsAllowed3', s3);

      db.close();

      var m1 = new M1;
      assert.strictEqual(null, m1.b);
      var m2 = new M2;
      assert.strictEqual(false, m2.b);
      var m3 = new M3;
      assert.strictEqual(true, m3.b);
      done();
    });

    it('strictBool option (gh-5211)', function(done) {
      var db = start(),
          s1 = new Schema({b: {type: Boolean, strictBool: true}}),
          M1 = db.model('StrictBoolTrue', s1);
      db.close();

      var strictValues = [true, false, 'true', 'false', 0, 1, '0', '1'];

      var testsRemaining = strictValues.length;
      strictValues.forEach(function(value) {
        var doc = new M1;
        doc.b = value;
        doc.validate(function(error) {
          if (error) {
            // test fails as soon as one value fails
            return done(error);
          }
          if (!--testsRemaining) {
            return done();
          }
        });
      });
    });

    it('strictBool schema option', function(done) {
      var db = start(),
          s1 = new Schema({b: {type: Boolean}}, {strictBool: true}),
          M1 = db.model('StrictBoolTrue', s1);
      db.close();

      var strictValues = [true, false, 'true', 'false', 0, 1, '0', '1'];

      strictValues.forEach(function(value) {
        var doc = new M1;
        doc.b = value;
        doc.validate(function(error) {
          if (error) {
            // test fails as soon as one value fails
            return done(error);
          }
        });
      });

      var doc = new M1;
      doc.b = 'Not a boolean';
      doc.validate(function(error) {
        if (error) {
          done();
        } else {
          done(new Error('ValidationError expected'));
        }
      });
    });

  });
});
