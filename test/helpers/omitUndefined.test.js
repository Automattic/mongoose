/* eslint-disable no-undef */

'use strict';

const assert = require('assert');
const omitUndefined = require('../../lib/helpers/omitUndefined');

describe('omitUndefined', function() {

  describe('non-object passthrough', function() {
    it('returns null unchanged', function() {
      assert.strictEqual(omitUndefined(null), null);
    });

    it('returns undefined unchanged', function() {
      assert.strictEqual(omitUndefined(undefined), undefined);
    });

    it('returns a string unchanged', function() {
      assert.strictEqual(omitUndefined('hello'), 'hello');
    });

    it('returns a number unchanged', function() {
      assert.strictEqual(omitUndefined(42), 42);
    });

    it('returns false unchanged', function() {
      assert.strictEqual(omitUndefined(false), false);
    });
  });


  describe('shallow — plain objects', function() {
    it('removes top-level undefined keys', function() {
      const obj = { a: 1, b: undefined, c: 'hello' };
      const result = omitUndefined(obj);
      assert.deepStrictEqual(result, { a: 1, c: 'hello' });
    });

    it('returns the same object reference (mutates in place)', function() {
      const obj = { a: undefined };
      const result = omitUndefined(obj);
      assert.strictEqual(result, obj);
    });

    it('keeps null values', function() {
      const obj = { a: null, b: undefined };
      omitUndefined(obj);
      assert.deepStrictEqual(obj, { a: null });
    });

    it('keeps falsy-but-defined values (0, false, empty string)', function() {
      const obj = { a: 0, b: false, c: '', d: undefined };
      omitUndefined(obj);
      assert.deepStrictEqual(obj, { a: 0, b: false, c: '' });
    });

    it('does NOT remove undefined from nested objects by default', function() {
      const obj = { a: { b: undefined } };
      omitUndefined(obj);
      // shallow: nested `b` is left untouched
      assert.ok(Object.hasOwn(obj.a, 'b'), 'nested undefined should survive shallow pass');
    });
  });

  describe('shallow — arrays', function() {
    it('removes undefined slots from a top-level array', function() {
      const arr = [1, undefined, 2, undefined, 3];
      omitUndefined(arr);
      assert.deepStrictEqual(arr, [1, 2, 3]);
    });

    it('returns the same array reference', function() {
      const arr = [undefined];
      const result = omitUndefined(arr);
      assert.strictEqual(result, arr);
    });

    it('keeps null elements in arrays', function() {
      const arr = [null, undefined, 0];
      omitUndefined(arr);
      assert.deepStrictEqual(arr, [null, 0]);
    });

    it('does NOT recurse into array elements by default', function() {
      const arr = [{ a: undefined }];
      omitUndefined(arr);
      assert.ok(Object.hasOwn(arr[0], 'a'), 'nested undefined in array element should survive');
    });
  });

  describe('deep — plain objects', function() {
    it('removes undefined from a single nested level', function() {
      const obj = { a: { b: undefined, c: 2 } };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { a: { c: 2 } });
    });

    it('removes undefined from multiple levels of nesting', function() {
      const obj = { a: { b: { c: undefined, d: 4 }, e: undefined }, f: 6 };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { a: { b: { d: 4 } }, f: 6 });
    });

    it('removes top-level undefined keys as well', function() {
      const obj = { a: undefined, b: { c: undefined, d: 1 } };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { b: { d: 1 } });
    });

    it('returns the same object reference', function() {
      const obj = { a: { b: undefined } };
      const result = omitUndefined(obj, { deep: true });
      assert.strictEqual(result, obj);
    });

    it('does not touch null or other falsy values in deep mode', function() {
      const obj = { a: null, b: { c: false, d: 0, e: undefined } };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { a: null, b: { c: false, d: 0 } });
    });

    it('handles objects created with Object.create(null)', function() {
      const inner = Object.create(null);
      inner.x = undefined;
      inner.y = 42;
      const obj = { inner };
      omitUndefined(obj, { deep: true });
      assert.ok(!Object.hasOwn(obj.inner, 'x'), 'undefined key should be removed');
      assert.strictEqual(obj.inner.y, 42);
    });
  });

  describe('deep — arrays', function() {
    it('removes undefined from nested arrays', function() {
      const obj = { items: [1, undefined, 2] };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { items: [1, 2] });
    });

    it('removes undefined from objects inside arrays', function() {
      const obj = { users: [{ name: 'Alice', age: undefined }, { name: 'Bob', age: 30 }] };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { users: [{ name: 'Alice' }, { name: 'Bob', age: 30 }] });
    });

    it('handles deeply nested arrays of arrays', function() {
      const arr = [[undefined, 1], [2, undefined]];
      omitUndefined(arr, { deep: true });
      assert.deepStrictEqual(arr, [[1], [2]]);
    });

    it('handles mixed nesting: array containing objects containing arrays', function() {
      const obj = {
        list: [
          { tags: ['a', undefined, 'b'], score: undefined },
          undefined
        ]
      };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { list: [{ tags: ['a', 'b'] }] });
    });
  });

  // ─── edge cases ─────────────────────────────────────────────────────────────

  describe('edge cases', function() {
    it('handles an empty object', function() {
      const obj = {};
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, {});
    });

    it('handles an empty array', function() {
      const arr = [];
      omitUndefined(arr, { deep: true });
      assert.deepStrictEqual(arr, []);
    });

    it('handles an object with no undefined keys', function() {
      const obj = { a: 1, b: { c: 2 } };
      omitUndefined(obj, { deep: true });
      assert.deepStrictEqual(obj, { a: 1, b: { c: 2 } });
    });

    it('treats { deep: false } the same as the shallow default', function() {
      const obj = { a: undefined, b: { c: undefined } };
      omitUndefined(obj, { deep: false });
      // top-level `a` removed, nested `c` preserved
      assert.ok(!Object.hasOwn(obj, 'a'), 'top-level a should be removed');
      assert.ok(Object.hasOwn(obj.b, 'c'), 'nested c should survive');
    });

    it('stops recursion at Date objects (does not try to iterate their keys)', function() {
      const obj = { createdAt: new Date('2024-01-01'), name: undefined };
      omitUndefined(obj, { deep: true });
      assert.ok(obj.createdAt instanceof Date);
      assert.ok(!Object.hasOwn(obj, 'name'));
    });
  });
});