'use strict';

require('../common');

const assert = require('assert');
const selectPopulatedFields = require('../../lib/helpers/query/selectPopulatedFields');

describe('Query helpers', function() {
  describe('selectPopulatedFields', function() {
    it('handles nested populate if parent key is projected in (gh-5669)', function() {
      const fields = { nested: 1 };
      selectPopulatedFields(fields, { nested: 1 }, { 'nested.key1': true });

      assert.deepEqual(fields, { nested: 1 });
    });

    it('handles nested populate if parent key is projected out (gh-5669)', function() {
      const fields = { nested: 0 };
      selectPopulatedFields(fields, { nested: 0 }, { 'nested.key1': true });

      assert.deepEqual(fields, { nested: 0 });
    });

    it('handle explicitly excluded paths (gh-7383)', function() {
      const fields = { name: 1, other: 0 };
      selectPopulatedFields(fields, Object.assign({}, fields), { other: 1 });

      assert.deepEqual(fields, { name: 1 });
    });

    it('handles paths selected with elemMatch (gh-9973)', function() {
      const fields = { 'arr.$': 1 };
      selectPopulatedFields(fields, Object.assign({}, fields), { 'arr.el': 1 });
      assert.deepEqual(fields, { 'arr.$': 1 });
    });
  });
});
