'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const applyProjection = require('../../lib/helpers/projection/applyProjection');

describe('applyProjection', function() {
  it('handles deep inclusive projections', function() {
    const obj = { str: 'test', nested: { str2: 'test2', num3: 42 } };

    assert.deepEqual(applyProjection(obj, { str: 1 }), { str: 'test' });
    assert.deepEqual(applyProjection(obj, { 'nested.str2': 1 }), { nested: { str2: 'test2' } });
    assert.deepEqual(applyProjection(obj, { str: 1, nested: { num3: 1 } }), { str: 'test', nested: { num3: 42 } });
  });

  it('handles deep exclusive projections', function() {
    const obj = { str: 'test', nested: { str2: 'test2', num3: 42 } };

    assert.deepEqual(applyProjection(obj, { nested: 0 }), { str: 'test' });
    assert.deepEqual(applyProjection(obj, { 'nested.str2': 0 }), { str: 'test', nested: { num3: 42 } });
    assert.deepEqual(applyProjection(obj, { nested: { num3: 0 } }), { str: 'test', nested: { str2: 'test2' } });
  });

  it('handles projections underneath arrays (gh-14680)', function() {
    const obj = {
      _id: 12,
      testField: 'foo',
      testArray: [{ _id: 42, field1: 'bar' }]
    };

    assert.deepEqual(applyProjection(obj, { 'testArray.field1': 1 }), { testArray: [{ field1: 'bar' }] });
    assert.deepEqual(applyProjection(obj, { 'testArray.field1': 0, _id: 0 }), { testField: 'foo', testArray: [{ _id: 42 }] });
  });
});
