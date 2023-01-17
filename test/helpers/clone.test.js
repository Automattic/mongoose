'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const clone = require('../../lib/helpers/clone');
const symbols = require('../../lib/helpers/symbols');
const ObjectId = require('../../lib/types/objectid');
const Decimal = require('../../lib/types/decimal128');

describe('clone', () => {
  describe('falsy', () => {
    it('is null when null', () => {
      assert.deepStrictEqual(clone(null), null);
    });

    it('is false when false', () => {
      assert.deepStrictEqual(clone(false), false);
    });

    it('is undefined when undefined', () => {
      assert.deepStrictEqual(clone(undefined), undefined);
    });

    it('is 0 when 0', () => {
      assert.deepStrictEqual(clone(0), 0);
    });
  });

  describe('Array', () => {
    it('clones first level', () => {
      const base = [1, 2];
      const cloned = clone(base);
      assert.deepStrictEqual(cloned, base);
      cloned[0] = 2;
      assert.deepStrictEqual(base, [1, 2]);
      assert.deepStrictEqual(cloned, [2, 2]);
    });

    it('clones deeper', () => {
      const base = [0, [1], { 2: 2 }];
      const cloned = clone(base);
      assert.deepStrictEqual(cloned, base);
      cloned[0] = 1;
      cloned[1][0] = 2;
      cloned[2][2] = 3;
      assert.deepStrictEqual(cloned, [1, [2], { 2: 3 }]);
      assert.deepStrictEqual(base, [0, [1], { 2: 2 }]);
    });
  });

  describe('mongoose object', () => {
    it('use toObject', () => {
      const base = {
        $__: true,
        myAttr: 'myAttrVal',
        toObject() {
          const obj = JSON.parse(JSON.stringify(base));
          obj.toObject = base.toObject;
          return obj;
        }
      };
      const cloned = clone(base);
      assert.deepStrictEqual(cloned, base);
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'myAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
    });

    it('use toJSON', () => {
      const base = {
        $__: true,
        myAttr: 'myAttrVal',
        toJSON: () => JSON.stringify({ $__: true, myAttr: 'myAttrVal' })
      };
      const cloned = JSON.parse(clone(base, { json: true }));
      assert.equal(cloned.myAttr, 'myAttrVal');
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'myAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
    });

    it('skipSingleNestedGetters', () => {
      const baseOpts = { _skipSingleNestedGetters: true, $isSingleNested: true };
      const base = {
        $__: true,
        myAttr: 'myAttrVal',
        $isSingleNested: true,
        toObject(cloneOpts) {
          assert.deepStrictEqual(
            Object.assign({}, baseOpts, { getters: false }),
            cloneOpts
          );
          const obj = JSON.parse(JSON.stringify(base));
          obj.toObject = base.toObject;
          return obj;
        }
      };
      const cloned = clone(base, baseOpts);
      assert.deepStrictEqual(cloned, base);
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'myAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
    });
  });

  describe('global objects', () => {
    describe('constructor is Object', () => {
      it('!minimize || isArrayChild', () => {
        const base = { myAttr: 'myAttrVal' };
        const cloned = clone(base);
        assert.deepStrictEqual(cloned, base);
        cloned.myAttr = 'otherAttrVal';
        assert.equal(base.myAttr, 'myAttrVal');
        assert.equal(cloned.myAttr, 'otherAttrVal');
      });

      it('!constructor && !minimize || isArrayChild', () => {
        const base = Object.create(null);
        base.myAttr = 'myAttrVal';
        const cloned = clone(base);
        assert.equal(base.myAttr, cloned.myAttr);
        cloned.myAttr = 'otherAttrVal';
        assert.equal(base.myAttr, 'myAttrVal');
        assert.equal(cloned.myAttr, 'otherAttrVal');
      });

      it('minimize && !isArrayChild && hasKey', () => {
        const base = { myAttr: 'myAttrVal', otherAttr: undefined, prototype: 'p' };
        const cloned = clone(base, { minimize: true }, true);
        assert.equal(base.myAttr, cloned.myAttr);
        assert.deepStrictEqual(Object.keys(base), ['myAttr', 'otherAttr', 'prototype']);
        assert.deepStrictEqual(Object.keys(cloned), ['myAttr']);
      });

      it('minimize and !isArrayChild && !hasKey', () => {
        const base = { otherAttr: undefined, prototype: 'p' };
        const cloned = clone(base, { minimize: true }, false);
        assert.equal(cloned, null);
      });
    });

    describe('constructor is Data', () => {
      it('return new equal date ', () => {
        const base = new Date();
        const cloned = clone(base);
        assert.deepStrictEqual(base, cloned);
      });
    });

    describe('constructor is RegExp', () => {
      it('return new equal date ', () => {
        const base = new RegExp(/A-Z.*/g);
        base.lastIndex = 2;
        const cloned = clone(base);
        assert.deepStrictEqual(base, cloned);
        assert.ok(base.lastIndex === cloned.lastIndex);
      });
    });
  });

  describe('mongo object', () => {
    it('is instance of ObjectId', () => {
      const base = new ObjectId();
      const cloned = clone(base);
      assert.deepStrictEqual(base, cloned);
    });
  });

  describe('schema type', () => {
    it('have schemaTypeSymbol property', () => {
      const base = {
        myAttr: 'myAttrVal',
        [symbols.schemaTypeSymbol]: 'MyType',
        clone() {
          return {
            myAttr: this.myAttr
          };
        }
      };
      const cloned = clone(base);
      assert.deepStrictEqual(base.myAttr, cloned.myAttr);
    });
  });

  describe('bson', () => {
    it('Decimal128', () => {
      const base = {
        _bsontype: 'Decimal128',
        toString() { return '128'; }
      };
      base.constructor = undefined;
      const cloned = clone(base);
      const expected = Decimal.fromString(base.toString());
      assert.deepStrictEqual(cloned, expected);
    });

    it('Decimal128 (flatternDecimal)', () => {
      const base = {
        _bsontype: 'Decimal128',
        toJSON() { return 128; }
      };
      base.constructor = undefined;
      const cloned = clone(base, { flattenDecimals: true });
      assert.deepStrictEqual(cloned, base.toJSON());
    });

    it('does nothing', () => {
      class BeeSon {
        constructor() { this.myAttr = 'myAttrVal'; }
        toBSON() {}
      }
      const base = new BeeSon();
      const cloned = clone(base, { bson: true });
      assert.equal(base.myAttr, cloned.myAttr);
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'otherAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
    });
  });

  describe('any else', () => {
    it('valueOf', () => {
      let called = false;
      class Wrapper {
        constructor(myAttr) {
          this.myAttr = myAttr;
        }
        valueOf() {
          called = true;
          return new Wrapper(this.myAttr);
        }
      }
      const base = new Wrapper('myAttrVal');
      const cloned = clone(base);
      assert.ok(called);
      assert.deepStrictEqual(cloned, base);
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'myAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
    });

    it('cloneObject', () => {
      class CloneMe {
        constructor(myAttr) {
          this.myAttr = myAttr;
        }
      }
      const base = new CloneMe('myAttrVal');
      base.valueOf = undefined;
      const cloned = clone(base);
      assert.equal(base.myAttr, cloned.myAttr);
      cloned.myAttr = 'otherAttrVal';
      assert.equal(base.myAttr, 'myAttrVal');
      assert.equal(cloned.myAttr, 'otherAttrVal');
      // I can't say it's expected behavior, but is how it's behave.
      assert.equal(typeof cloned, 'object');
      assert.equal(cloned.constructor, Object);
    });
  });

  it('retains RegExp options gh-1355', function() {
    const a = new RegExp('hello', 'igm');
    assert.ok(a.global);
    assert.ok(a.ignoreCase);
    assert.ok(a.multiline);

    const b = clone(a);
    assert.equal(b.source, a.source);
    assert.equal(a.global, b.global);
    assert.equal(a.ignoreCase, b.ignoreCase);
    assert.equal(a.multiline, b.multiline);
  });

  it('clones objects created with Object.create(null)', function() {
    const o = Object.create(null);
    o.a = 0;
    o.b = '0';
    o.c = 1;
    o.d = '1';

    const out = clone(o);
    assert.strictEqual(0, out.a);
    assert.strictEqual('0', out.b);
    assert.strictEqual(1, out.c);
    assert.strictEqual('1', out.d);
    assert.equal(Object.keys(out).length, 4);
  });

  it('doesnt minimize empty objects in arrays to null (gh-7322)', function() {
    const o = { arr: [{ a: 42 }, {}, {}] };

    const out = clone(o, { minimize: true });
    assert.deepEqual(out.arr[0], { a: 42 });
    assert.deepEqual(out.arr[1], {});
    assert.deepEqual(out.arr[2], {});
  });

  it('skips cloning types that have `toBSON()` if `bson` is set (gh-8299)', function() {
    const o = {
      toBSON() {
        return 'toBSON';
      },
      valueOf() {
        return 'valueOf()';
      }
    };

    const out = clone(o, { bson: true });
    assert.deepEqual(out, o);
  });
});
