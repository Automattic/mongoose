'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schematype', function() {
  describe('boolean', function() {
    it('null default is permitted (gh-523)', function(done) {
      mongoose.deleteModel(/Test/);
      const s1 = new Schema({ b: { type: Boolean, default: null } });
      const M1 = mongoose.model('Test1', s1);
      const s2 = new Schema({ b: { type: Boolean, default: false } });
      const M2 = mongoose.model('Test2', s2);
      const s3 = new Schema({ b: { type: Boolean, default: true } });
      const M3 = mongoose.model('Test3', s3);

      const m1 = new M1();
      assert.strictEqual(null, m1.b);
      const m2 = new M2();
      assert.strictEqual(false, m2.b);
      const m3 = new M3();
      assert.strictEqual(true, m3.b);
      done();
    });
    it('should cast truthy strings & numbers to true', function(done) {
      // Check whether a truthy String value can be casted to true
      const s4 = new Schema({ b: { type: Boolean, default: 'yes' } });
      const M4 = mongoose.model('Test4', s4);
      // Check whether a truthy number can be casted to true
      const s5 = new Schema({ b: { type: Boolean, default: 1 } });
      const M5 = mongoose.model('Test5', s5);

      const m4 = new M4();
      assert.strictEqual(true, m4.b);
      const m5 = new M5();
      assert.strictEqual(true, m5.b);
      done();
    });
    it('should throw an error for values that can\'t be casted to a boolean value (without custom boolean casting declaration)', async function() {
      const s6 = new Schema({ b: Boolean });
      const M6 = mongoose.model('Test6', s6);
      let threw = false;
      try {
        const newRow = new M6({ b: 'sí' });
        await newRow.save();
      } catch (error) {
        threw = true;
      }
      assert.ok(threw);
    });
  });
});
