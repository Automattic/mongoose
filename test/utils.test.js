'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

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
    it('should detect a path as required if it has been required', function() {
      const ar = new ActiveRoster();
      ar.require('hello');
      assert.equal(ar.paths.hello, 'require');
    });

    it('should detect a path as inited if it has been inited', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      assert.equal(ar.paths.hello, 'init');
    });

    it('should detect a path as modified', function() {
      const ar = new ActiveRoster();
      ar.modify('hello');
      assert.equal(ar.paths.hello, 'modify');
    });

    it('should remove a path from an old state upon a state change', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('hello');
      assert.ok(!ar.states.init.hasOwnProperty('hello'));
      assert.ok(ar.states.modify.hasOwnProperty('hello'));
    });

    it('forEach should be able to iterate through the paths belonging to one state', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach('init', function(path) {
        assert.ok(~['hello', 'goodbye'].indexOf(path));
      });
    });

    it('forEach should be able to iterate through the paths in the union of two or more states', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach('modify', 'require', function(path) {
        assert.ok(~['world', 'foo'].indexOf(path));
      });
    });

    it('forEach should iterate through all paths that have any state if given no state arguments', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.init('goodbye');
      ar.modify('world');
      ar.require('foo');
      ar.forEach(function(path) {
        assert.ok(~['hello', 'goodbye', 'world', 'foo'].indexOf(path));
      });
    });

    it('should be able to detect if at least one path exists in a set of states', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      assert.ok(ar.some('init'));
      assert.ok(ar.some('modify'));
      assert.ok(!ar.some('require'));
      assert.ok(ar.some('init', 'modify'));
      assert.ok(ar.some('init', 'require'));
      assert.ok(ar.some('modify', 'require'));
    });

    it('should be able to `map` over the set of paths in a given state', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      const suffixedPaths = ar.map('init', 'modify', function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['hello-suffix', 'world-suffix']);
    });

    it('should `map` over all states\' paths if no states are specified in a `map` invocation', function() {
      const ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      const suffixedPaths = ar.map(function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['iAmTheWalrus-suffix', 'hello-suffix', 'world-suffix']);
    });
  });

  it('utils.options', function() {
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
  });

  it('deepEquals on ObjectIds', function() {
    const s = (new ObjectId()).toString();

    const a = new ObjectId(s);
    const b = new ObjectId(s);

    assert.ok(utils.deepEqual(a, b));
    assert.ok(utils.deepEqual(a, a));
    assert.ok(!utils.deepEqual(a, new ObjectId()));
  });

  it('deepEquals on maps (gh-9549)', function() {
    const a = new Map([['a', 1], ['b', 2]]);
    let b = new Map([['a', 1], ['b', 2]]);

    assert.ok(utils.deepEqual(a, b));

    b = new Map([['a', 1]]);
    assert.ok(!utils.deepEqual(a, b));

    b = new Map([['b', 2], ['a', 1]]);
    assert.ok(!utils.deepEqual(a, b));
  });

  it('deepEquals on MongooseDocumentArray works', function() {
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

    const m2 = new M();
    m2.init(m1.toObject());

    assert.ok(utils.deepEqual(m1.a1, m2.a1));

    m2.set(m1.toObject());
    assert.ok(utils.deepEqual(m1.a1, m2.a1));
  });

  // gh-688
  it('deepEquals with MongooseBuffer', function() {
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
  });

  it('`deepEqual` treats objects with different order of keys as different (gh-9571)', function() {
    const user1 = {
      name: 'Hafez',
      age: 26
    };
    const user2 = {
      age: 26,
      name: 'Hafez'
    };

    assert.equal(utils.deepEqual(user1, user2), false);
  });

  it('deepEqual on arrays and non-arrays (gh-11417)', function() {
    assert.ok(!utils.deepEqual([], 2));
    assert.ok(!utils.deepEqual(2, []));
  });

  it('array.flatten', function() {
    const orig = [0, [1, 2, [3, 4, [5, [6]], 7], 8], 9];
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], utils.array.flatten(orig));
  });

  it('array.unique', function() {
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
  });

  describe('merge', function() {
    it('merges two objects together without overriding properties & methods', function() {
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
    });
  });

  describe('mergeClone', function() {
    it('handles object with valueOf() (gh-6059)', function() {
      const from = {
        val: {
          valueOf: function() { return 42; }
        }
      };
      const to = { val: 41 };

      utils.mergeClone(to, from);

      assert.equal(to.val, 42);
    });

    it('copies dates correctly (gh-6145)', function() {
      const from = {
        val: new Date('2011-06-01')
      };
      const to = { val: new Date('2012-06-01') };

      utils.mergeClone(to, from);

      assert.ok(to.val instanceof Date);
    });
  });
  describe('errorToPOJO(...)', () => {
    it('converts an error to a POJO', () => {
      // Arrange
      const err = new Error('Something bad happened.');
      err.metadata = { hello: 'world' };

      // Act
      const pojoError = utils.errorToPOJO(err);

      // Assert
      assert.equal(pojoError.message, 'Something bad happened.');
      assert.ok(pojoError.stack);
      assert.deepEqual(pojoError.metadata, { hello: 'world' });
    });
    it('throws an error when argument is not an error object', () => {
      let errorWhenConverting;
      try {
        utils.errorToPOJO({ message: 'I am a POJO', stack: 'Does not matter' });
      } catch (_err) {
        errorWhenConverting = _err;
      }
      assert.equal(errorWhenConverting.message, '`error` must be `instanceof Error`.');
    });
    it('works with classes that extend `Error`', () => {
      // Arrange
      class OperationalError extends Error {
        constructor(message) {
          super(message);
        }
      }

      const err = new OperationalError('Something bad happened.');
      err.metadata = { hello: 'world' };

      // Act
      const pojoError = utils.errorToPOJO(err);

      // Assert
      assert.equal(pojoError.message, 'Something bad happened.');
      assert.ok(pojoError.stack);
      assert.deepEqual(pojoError.metadata, { hello: 'world' });
    });
  });
});
