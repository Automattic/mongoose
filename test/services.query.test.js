'use strict';

require('./common');

const Query = require('../lib/query');
const Schema = require('../lib/schema');
const assert = require('assert');
const selectPopulatedFields = require('../lib/helpers/query/selectPopulatedFields');

describe('Query helpers', function() {
  describe('selectPopulatedFields', function() {
    it('handles nested populate if parent key is projected in (gh-5669)', function(done) {
      const schema = new Schema({
        nested: {
          key1: String,
          key2: String
        }
      });

      const q = new Query({});
      q.schema = schema;

      assert.strictEqual(q._fields, void 0);

      q.select('nested');
      q.populate('nested.key1');
      assert.deepEqual(q._fields, { nested: 1 });

      selectPopulatedFields(q);

      assert.deepEqual(q._fields, { nested: 1 });

      done();
    });

    it('handles nested populate if parent key is projected out (gh-5669)', function(done) {
      const schema = new Schema({
        nested: {
          key1: String,
          key2: String
        }
      });

      const q = new Query({});
      q.schema = schema;

      assert.strictEqual(q._fields, void 0);

      q.select('-nested');
      q.populate('nested.key1');
      assert.deepEqual(q._fields, { nested: 0 });

      selectPopulatedFields(q);

      assert.deepEqual(q._fields, { nested: 0 });

      done();
    });

    it('handle explicitly excluded paths (gh-7383)', function(done) {
      const schema = new Schema({
        name: String,
        other: String
      });

      const q = new Query({});
      q.schema = schema;

      assert.strictEqual(q._fields, void 0);

      q.select({ name: 1, other: 0 });
      q.populate('other');
      assert.deepEqual(q._fields, { name: 1, other: 0 });

      selectPopulatedFields(q);

      assert.deepEqual(q._fields, { name: 1 });

      done();
    });
  });
});
