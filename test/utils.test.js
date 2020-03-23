'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Buffer = require('safe-buffer').Buffer;
const MongooseBuffer = require('../lib/types/buffer');
const ObjectId = require('../lib/types/objectid');
const StateMachine = require('../lib/statemachine');
const assert = require('assert');
const utils = require('../lib/utils');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Setup.
 */

const ActiveRoster = StateMachine.ctor('require', 'init', 'modify');

/**
 * Test.
 */

describe('utils', function() {
  describe('ActiveRoster', function() {
    it('should detect a path as required if it has been required', function(done) {
      const ar = new ActiveRoster();
      ar.require('hello');
      assert.equal(ar.paths.hello, 'require');
      done();
    });

    it('should detect a path as inited if it has been inited', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      assert.equal(ar.paths.hello, 'init');
      done();
    });

    it('should detect a path as modified', function(done) {
      const ar = new ActiveRoster();
      ar.modify('hello');
      assert.equal(ar.paths.hello, 'modify');
      done();
    });

    it('should remove a path from an old state upon a state change', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('hello');
      assert.ok(!ar.states.init.hasOwnProperty('hello'));
      assert.ok(ar.states.modify.hasOwnProperty('hello'));
      done();
    });

    it('forEach should be able to iterate through the paths belonging to one state', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach('init', function(path) {
        assert.ok(~['hello', 'goodbye'].indexOf(path));
      });
      done();
    });

    it('forEach should be able to iterate through the paths in the union of two or more states', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach('modify', 'require', function(path) {
        assert.ok(~['world', 'foo'].indexOf(path));
      });
      done();
    });

    it('forEach should iterate through all paths that have any state if given no state arguments', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach(function(path) {
        assert.ok(~['hello', 'goodbye', 'world', 'foo'].indexOf(path));
      });
      done();
    });

    it('should be able to detect if at least one path exists in a set of states', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      assert.ok(ar.some('init'));
      assert.ok(ar.some('modify'));
      assert.ok(!ar.some('require'));
      assert.ok(ar.some('init', 'modify'));
      assert.ok(ar.some('init', 'require'));
      assert.ok(ar.some('modify', 'require'));
      done();
    });

    it('should be able to `map` over the set of paths in a given state', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      const suffixedPaths = ar.map('init', 'modify', function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['hello-suffix', 'world-suffix']);
      done();
    });

    it('should `map` over all states\' paths if no states are specified in a `map` invocation', function(done) {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      const suffixedPaths = ar.map(function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['iAmTheWalrus-suffix', 'hello-suffix', 'world-suffix']);
      done();
    });
  });

  it('utils.options', function(done) {
    const o = { a: 1, b: 2, c: 3, 0: 'zero1' };
    const defaults = { b: 10, d: 20, 0: 'zero2' };
    const result = utils.options(defaults, o);
    assert.equal(result.a, 1);
    assert.equal(result.b, 2);
    assert.equal(result.c, 3);
    assert.equal(result.d, 20);
    assert.deepEqual(o.d, result.d);
    assert.equal(result['0'], 'zero1');

    const result2 = utils.options(defaults);
    assert.equal(result2.b, 10);
    assert.equal(result2.d, 20);
    assert.equal(result2['0'], 'zero2');

    // same properties/vals
    assert.deepEqual(defaults, result2);

    // same object
    assert.notEqual(defaults, result2);
    done();
  });

  it('deepEquals on ObjectIds', function(done) {
    const s = (new ObjectId).toString();

    const a = new ObjectId(s);
    const b = new ObjectId(s);

    assert.ok(utils.deepEqual(a, b));
    assert.ok(utils.deepEqual(a, a));
    assert.ok(!utils.deepEqual(a, new ObjectId));
    done();
  });

  it('deepEquals on MongooseDocumentArray works', function(done) {
    const A = new Schema({ a: String });
    mongoose.deleteModel(/Test/);
    const M = mongoose.model('Test', new Schema({
      a1: [A],
      a2: [A]
    }));

    const m1 = new M({
      a1: [{ a: 'Hi' }, { a: 'Bye' }]
    });

    m1.a2 = m1.a1;
    assert.ok(utils.deepEqual(m1.a1, m1.a2));

    const m2 = new M;
    m2.init(m1.toObject());

    assert.ok(utils.deepEqual(m1.a1, m2.a1));

    m2.set(m1.toObject());
    assert.ok(utils.deepEqual(m1.a1, m2.a1));
    done();
  });

  // gh-688
  it('deepEquals with MongooseBuffer', function(done) {
    const str = 'this is the day';
    const a = new MongooseBuffer(str);
    const b = new MongooseBuffer(str);
    const c = Buffer.from(str);
    const d = Buffer.from('this is the way');
    const e = Buffer.from('other length');

    assert.ok(utils.deepEqual(a, b));
    assert.ok(utils.deepEqual(a, c));
    assert.ok(!utils.deepEqual(a, d));
    assert.ok(!utils.deepEqual(a, e));
    assert.ok(!utils.deepEqual(a, []));
    assert.ok(!utils.deepEqual([], a));
    done();
  });

  describe('clone', function() {
    it('retains RegExp options gh-1355', function(done) {
      const a = new RegExp('hello', 'igm');
      assert.ok(a.global);
      assert.ok(a.ignoreCase);
      assert.ok(a.multiline);

      const b = utils.clone(a);
      assert.equal(b.source, a.source);
      assert.equal(a.global, b.global);
      assert.equal(a.ignoreCase, b.ignoreCase);
      assert.equal(a.multiline, b.multiline);
      done();
    });

    it('clones objects created with Object.create(null)', function(done) {
      const o = Object.create(null);
      o.a = 0;
      o.b = '0';
      o.c = 1;
      o.d = '1';

      const out = utils.clone(o);
      assert.strictEqual(0, out.a);
      assert.strictEqual('0', out.b);
      assert.strictEqual(1, out.c);
      assert.strictEqual('1', out.d);
      assert.equal(Object.keys(out).length, 4);

      done();
    });

    it('doesnt minimize empty objects in arrays to null (gh-7322)', function() {
      const o = { arr: [{ a: 42 }, {}, {}] };

      const out = utils.clone(o, { minimize: true });
      assert.deepEqual(out.arr[0], { a: 42 });
      assert.deepEqual(out.arr[1], {});
      assert.deepEqual(out.arr[2], {});

      return Promise.resolve();
    });
  });

  it('array.flatten', function(done) {
    const orig = [0, [1, 2, [3, 4, [5, [6]], 7], 8], 9];
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], utils.array.flatten(orig));
    done();
  });

  it('array.unique', function(done) {
    const case1 = [1, 2, 3, 3, 5, 'a', 6, 'a'];
    assert.deepEqual(utils.array.unique(case1), [1, 2, 3, 5, 'a', 6]);
    const objId = new ObjectId('000000000000000000000001');
    const case2 = [
      1,
      '000000000000000000000001',
      1,
      objId,
      '000000000000000000000001',
      objId,
      1
    ];
    assert.deepEqual(utils.array.unique(case2),
      [1, '000000000000000000000001', objId]);
    done();
  });

  describe('merge', function() {
    it('merges two objects together without overriding properties & methods', function(done) {
      function To() {
        this.name = 'to';
        this.toProperty = true;
      }
      To.prototype.getName = function() {};
      To.prototype.toMethod = function() {};

      function From() {
        this.name = 'from';
        this.fromProperty = true;
      }
      From.prototype.getName = function() {};
      From.prototype.fromMethod = function() {};

      const to = new To();
      const from = new From();

      utils.merge(to, from);

      assert.equal(to.name, 'to');
      assert.equal(to.toProperty, true);
      assert.equal(to.fromProperty, true);
      assert.ok(to.getName === To.prototype.getName);
      assert.ok(to.toMethod === To.prototype.toMethod);
      assert.equal(to.fomMethod, From.prototype.fomMethod);

      done();
    });
  });

  describe('mergeClone', function() {
    it('handles object with valueOf() (gh-6059)', function(done) {
      const from = {
        val: {
          valueOf: function() { return 42; }
        }
      };
      const to = { val: 41 };

      utils.mergeClone(to, from);

      assert.equal(to.val, 42);

      done();
    });

    it('copies dates correctly (gh-6145)', function(done) {
      const from = {
        val: new Date('2011-06-01')
      };
      const to = { val: new Date('2012-06-01') };

      utils.mergeClone(to, from);

      assert.ok(to.val instanceof Date);

      done();
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

      const out = utils.clone(o, { bson: true });
      assert.deepEqual(out, o);
    });
  });
});
