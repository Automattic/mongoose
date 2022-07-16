'use strict';

const assert = require('assert');
const { trusted } = require('../../lib/helpers/query/trusted');
const sanitizeFilter = require('../../lib/helpers/query/sanitizeFilter');

describe('sanitizeFilter', function() {
  it('throws when filter includes a query selector', function() {
    let obj = { username: 'val', pwd: 'my secret' };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: 'my secret' });

    obj = { username: 'val', pwd: { $ne: null } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: { $eq: { $ne: null } } });
  });

  it('ignores explicitly defined query selectors', function() {
    let obj = { username: 'val', pwd: 'my secret' };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: 'my secret' });

    obj = { username: 'val', pwd: trusted({ $type: 'string', $eq: 'my secret' }) };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { username: 'val', pwd: { $type: 'string', $eq: 'my secret' } });
  });

  it('handles $and and $or', function() {
    let obj = { $and: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $and: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });

    obj = { $or: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $or: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });
  });
});
