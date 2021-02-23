'use strict';

const assert = require('assert');
const sanitize = require('../../lib/helpers/query/sanitize');

describe('sanitize', function() {
  it('throws when filter includes a query selector', function() {
    sanitize({ username: 'val', pwd: 'my secret' });

    assert.throws(() => {
      sanitize({ username: 'val', pwd: { $ne: null } });
    }, /Filter key `pwd` contains a query selector/);
  });
});