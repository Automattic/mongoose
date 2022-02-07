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
  });
});
