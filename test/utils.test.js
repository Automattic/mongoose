
/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    utils = require('../lib/utils'),
    StateMachine = require('../lib/statemachine'),
    ObjectId = require('../lib/types/objectid'),
    MongooseBuffer = require('../lib/types/buffer'),
    assert = require('power-assert');

/**
 * Setup.
 */

var ActiveRoster = StateMachine.ctor('require', 'init', 'modify');

/**
 * Test.
 */

describe('utils', function() {
  describe('toCollectionName', function() {
    it('works (gh-3490)', function(done) {
      assert.equal(utils.toCollectionName('stations'), 'stations');
      assert.equal(utils.toCollectionName('category'), 'categories');
      done();
    });
  });

  describe('ActiveRoster', function() {
    it('should detect a path as required if it has been required', function(done) {
      var ar = new ActiveRoster();
      ar.require('hello');
      assert.equal(ar.paths.hello, 'require');
      done();
    });

    it('should detect a path as inited if it has been inited', function(done) {
      var ar = new ActiveRoster();
      ar.init('hello');
      assert.equal(ar.paths.hello, 'init');
      done();
    });

    it('should detect a path as modified', function(done) {
      var ar = new ActiveRoster();
      ar.modify('hello');
      assert.equal(ar.paths.hello, 'modify');
      done();
    });

    it('should remove a path from an old state upon a state change', function(done) {
      var ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('hello');
      assert.ok(!ar.states.init.hasOwnProperty('hello'));
      assert.ok(ar.states.modify.hasOwnProperty('hello'));
      done();
    });

    it('forEach should be able to iterate through the paths belonging to one state', function(done) {
      var ar = new ActiveRoster();
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
      var ar = new ActiveRoster();
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
      var ar = new ActiveRoster();
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
      var ar = new ActiveRoster();
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
      var ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      var suffixedPaths = ar.map('init', 'modify', function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['hello-suffix', 'world-suffix']);
      done();
    });

    it('should `map` over all states\' paths if no states are specified in a `map` invocation', function(done) {
      var ar = new ActiveRoster();
      ar.init('hello');
      ar.modify('world');
      ar.require('iAmTheWalrus');
      var suffixedPaths = ar.map(function(path) {
        return path + '-suffix';
      });
      assert.deepEqual(suffixedPaths, ['iAmTheWalrus-suffix', 'hello-suffix', 'world-suffix']);
      done();
    });
  });

  it('utils.options', function(done) {
    var o = {a: 1, b: 2, c: 3, 0: 'zero1'};
    var defaults = {b: 10, d: 20, 0: 'zero2'};
    var result = utils.options(defaults, o);
    assert.equal(result.a, 1);
    assert.equal(result.b, 2);
    assert.equal(result.c, 3);
    assert.equal(result.d, 20);
    assert.deepEqual(o.d, result.d);
    assert.equal(result['0'], 'zero1');

    var result2 = utils.options(defaults);
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
    var s = (new ObjectId).toString();

    var a = new ObjectId(s),
        b = new ObjectId(s);

    assert.ok(utils.deepEqual(a, b));
    assert.ok(utils.deepEqual(a, a));
    assert.ok(!utils.deepEqual(a, new ObjectId));
    done();
  });

  it('deepEquals on MongooseDocumentArray works', function(done) {
    var db = start(),
        A = new Schema({a: String}),
        M = db.model('deepEqualsOnMongooseDocArray', new Schema({
          a1: [A],
          a2: [A]
        }));

    db.close();

    var m1 = new M({
      a1: [{a: 'Hi'}, {a: 'Bye'}]
    });

    m1.a2 = m1.a1;
    assert.ok(utils.deepEqual(m1.a1, m1.a2));

    var m2 = new M;
    m2.init(m1.toObject());

    assert.ok(utils.deepEqual(m1.a1, m2.a1));

    m2.set(m1.toObject());
    assert.ok(utils.deepEqual(m1.a1, m2.a1));
    done();
  });

  // gh-688
  it('deepEquals with MongooseBuffer', function(done) {
    var str = 'this is the day';
    var a = new MongooseBuffer(str);
    var b = new MongooseBuffer(str);
    var c = new Buffer(str);
    var d = new Buffer('this is the way');
    var e = new Buffer('other length');

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
      var a = new RegExp('hello', 'igm');
      assert.ok(a.global);
      assert.ok(a.ignoreCase);
      assert.ok(a.multiline);

      var b = utils.clone(a);
      assert.equal(b.source, a.source);
      assert.equal(a.global, b.global);
      assert.equal(a.ignoreCase, b.ignoreCase);
      assert.equal(a.multiline, b.multiline);
      done();
    });

    it('clones objects created with Object.create(null)', function(done) {
      var o = Object.create(null);
      o.a = 0;
      o.b = '0';
      o.c = 1;
      o.d = '1';

      var out = utils.clone(o);
      assert.strictEqual(0, out.a);
      assert.strictEqual('0', out.b);
      assert.strictEqual(1, out.c);
      assert.strictEqual('1', out.d);
      assert.equal(Object.keys(out).length, 4);

      done();
    });
  });

  it('array.flatten', function(done) {
    var orig = [0, [1, 2, [3, 4, [5, [6]], 7], 8], 9];
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], utils.array.flatten(orig));
    done();
  });

  it('array.unique', function(done) {
    var case1 = [1, 2, 3, 3, 5, 'a', 6, 'a'];
    assert.deepEqual(utils.array.unique(case1), [1, 2, 3, 5, 'a', 6]);
    var objId = new ObjectId('000000000000000000000001');
    var case2 = [
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

      var to = new To();
      var from = new From();

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

  describe('pluralize', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('should not pluralize _temp_ (gh-1703)', function(done) {
      var ASchema = new Schema({
        value: {type: Schema.Types.Mixed}
      });

      var collectionName = '_temp_';
      var A = db.model(collectionName, ASchema);
      assert.equal(A.collection.name, collectionName);
      done();
    });
    it('should pluralize _temp (gh-1703)', function(done) {
      var ASchema = new Schema({
        value: {type: Schema.Types.Mixed}
      });

      var collectionName = '_temp';
      var A = db.model(collectionName, ASchema);
      assert.equal(A.collection.name, collectionName + 's');
      done();
    });
    describe('option (gh-1707)', function() {
      it('should pluralize by default', function(done) {
        var ASchema = new Schema({value: String});

        var collectionName = 'singular';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName + 's');
        done();
      });
      it('should pluralize when global option set to true', function(done) {
        db.base.set('pluralization', true);

        var ASchema = new Schema({value: String});

        var collectionName = 'one';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName + 's');
        done();
      });
      it('should not pluralize when global option set to false', function(done) {
        db.base.set('pluralization', false);

        var ASchema = new Schema({value: String});

        var collectionName = 'two';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName);
        done();
      });
      it('should pluralize when local option set to true', function(done) {
        db.base.set('pluralization', false);

        // override
        var ASchema = new Schema({value: String}, {pluralization: true});

        var collectionName = 'three';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName + 's');
        done();
      });
      it('should not pluralize when local option set to false and global is true', function(done) {
        db.base.set('pluralization', true);

        var ASchema = new Schema({value: String}, {pluralization: false});

        var collectionName = 'four';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName);
        done();
      });
      it('should not pluralize when local option set to false and global not set', function(done) {
        var ASchema = new Schema({value: String}, {pluralization: false});

        var collectionName = 'five';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName);
        done();
      });
    });
  });
});
