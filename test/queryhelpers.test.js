'use strict';

require('./common');

const Schema = require('../lib/schema');
const assert = require('assert');
const queryhelpers = require('../lib/queryhelpers');

describe('queryhelpers', function() {
  describe('applyPaths', function() {
    it('adds select: true paths unless excluded using minus path (gh-11694)', function() {
      const schema = new Schema({
        name: { type: String, select: true },
        age: Number,
        other: String
      });

      let fields = { age: 1 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { age: 1, name: 1 });

      fields = { age: 1, name: 1 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { age: 1, name: 1 });

      fields = {};
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, {});

      fields = { other: 0 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { other: 0 });

      fields = { age: 1, '-name': 0 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { age: 1 });

      fields = { age: 1, '-name': 1 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { age: 1 });
    });

    it('supports nested minus path (gh-11694)', function() {
      const schema = new Schema({
        nested: {
          name: { type: String, select: true },
          age: Number,
          other: String
        }
      });

      const fields = { nested: 1 };
      queryhelpers.applyPaths(fields, schema);
      assert.deepStrictEqual(fields, { nested: 1 });
    });
  });
});
