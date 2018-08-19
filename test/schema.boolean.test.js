
/**
 * Module dependencies.
 */

'use strict';

let start = require('./common'), mongoose = start.mongoose, assert = require('power-assert'), Schema = mongoose.Schema;

describe('schematype', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('boolean', function() {
    it('null default is permitted (gh-523)', function(done) {
      let s1 = new Schema({b: {type: Boolean, default: null}}),
          M1 = db.model('NullDateDefaultIsAllowed1', s1),
          s2 = new Schema({b: {type: Boolean, default: false}}),
          M2 = db.model('NullDateDefaultIsAllowed2', s2),
          s3 = new Schema({b: {type: Boolean, default: true}}),
          M3 = db.model('NullDateDefaultIsAllowed3', s3);

      const m1 = new M1;
      assert.strictEqual(null, m1.b);
      const m2 = new M2;
      assert.strictEqual(false, m2.b);
      const m3 = new M3;
      assert.strictEqual(true, m3.b);
      done();
    });

    it('strictBool option (gh-5211)', function(done) {
      let s1 = new Schema({b: {type: Boolean}}),
          M1 = db.model('StrictBoolOption', s1);

      const strictValues = [true, false, 'true', 'false', 0, 1, '0', '1', 'no', 'yes'];

      let testsRemaining = strictValues.length;
      strictValues.forEach(function(value) {
        const doc = new M1;
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
      let s1 = new Schema({b: {type: Boolean}}, {strictBool: true}),
          M1 = db.model('StrictBoolTrue', s1);

      const strictValues = [true, false, 'true', 'false', 0, 1, '0', '1'];

      strictValues.forEach(function(value) {
        const doc = new M1;
        doc.b = value;
        doc.validate(function(error) {
          if (error) {
            // test fails as soon as one value fails
            return done(error);
          }
        });
      });

      const doc = new M1;
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
