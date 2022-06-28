'use strict';

const assert = require('assert');
const get = require('../../lib/helpers/get');

describe('get', function() {
  it('gets dotted properties', function() {
    const obj = { a: { b: { c: 42 } } };
    assert.strictEqual(get(obj, 'a.b.c', 43), 42);
  });

  it('returns default on undefined', function() {
    const obj = { a: { b: { c: void 0 } } };
    assert.strictEqual(get(obj, 'a.b.c', 42), 42);
  });

  it('returns default on bottom null', function() {
    const obj = { a: { b: { c: null } } };
    assert.strictEqual(get(obj, 'a.b.c', 42), 42);
  });

  it('returns default on top-level null', function() {
    const obj = { a: null };
    assert.strictEqual(get(obj, 'a.b.c', 42), 42);
  });

  it('works with maps', function() {
    const obj = { a: new Map([['b', { c: 42 }]]) };
    assert.strictEqual(get(obj, 'a.b.c', 43), 42);
  });

  it('works with dotted at top level', function() {
    const obj = { 'a.b': 42 };
    assert.strictEqual(get(obj, 'a.b', 43), 42);
  });

  it('works with dotted nested', function() {
    const obj = { a: { 'b.c': 42 } };
    assert.strictEqual(get(obj, 'a.b.c', 43), 42);
  });
});
