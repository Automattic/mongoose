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

  it('handles $nor (gh-16114)', function() {
    const obj = { $nor: [{ username: 'val' }, { pwd: { $ne: 'my secret' } }] };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { $nor: [{ username: 'val' }, { pwd: { $eq: { $ne: 'my secret' } } }] });
  });

  it('handles nested selector objects (gh-16114)', function() {
    const obj = { nested: { pwd: { $ne: null } } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { nested: { pwd: { $eq: { $ne: null } } } });
  });

  it('handles deeply nested selector objects (gh-16114)', function() {
    const obj = { a: { b: { c: { $gt: 5 } } } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { a: { b: { c: { $eq: { $gt: 5 } } } } });
  });

  it('does not modify nested objects without dollar keys (gh-16114)', function() {
    const obj = { nested: { field1: 'value1', field2: 42 } };
    sanitizeFilter(obj);
    assert.deepEqual(obj, { nested: { field1: 'value1', field2: 42 } });
  });

  it('handles mixed top-level and nested selectors (gh-16114)', function() {
    const obj = {
      topLevel: { $ne: null },
      nested: { pwd: { $ne: null } },
      safe: 'value'
    };
    sanitizeFilter(obj);
    assert.deepEqual(obj, {
      topLevel: { $eq: { $ne: null } },
      nested: { pwd: { $eq: { $ne: null } } },
      safe: 'value'
    });
  });
});
