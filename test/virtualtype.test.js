'use strict';

const VirtualType = require('../lib/virtualtype');
const assert = require('assert');

describe('VirtualType', function() {
  describe('clone', function() {
    it('copies path and options correctly (gh-8587)', function() {
      const opts = { ref: 'User', localField: 'userId', foreignField: '_id' };
      const virtual = new VirtualType(Object.assign({}, opts), 'users');

      const clone = virtual.clone();
      assert.equal(clone.path, 'users');
      assert.deepEqual(clone.options, opts);
    });
  });
});
