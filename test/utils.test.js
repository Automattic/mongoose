
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , utils = require('../lib/utils')
  , StateMachine = require('../lib/statemachine')
  , ObjectId = require('../lib/types/objectid')
  , MongooseBuffer = require('../lib/types/buffer')
  , assert = require('assert')

/**
 * Setup.
 */

var ActiveRoster = StateMachine.ctor('require', 'init', 'modify');

/**
 * Test.
 */

describe('utils', function(){
  it('should detect a path as required if it has been required', function () {
    var ar = new ActiveRoster();
    ar.require('hello');
    assert.equal(ar.paths['hello'],'require');
  })

  it('should detect a path as inited if it has been inited', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    assert.equal(ar.paths['hello'],'init');
  })

  it('should detect a path as modified', function () {
    var ar = new ActiveRoster();
    ar.modify('hello');
    assert.equal(ar.paths['hello'],'modify');
  })

  it('should remove a path from an old state upon a state change', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('hello');
    assert.ok(!ar.states.init.hasOwnProperty('hello'));
    assert.ok(ar.states.modify.hasOwnProperty('hello'));
  })

  it('forEach should be able to iterate through the paths belonging to one state', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach('init', function (path) {
      assert.ok(~['hello', 'goodbye'].indexOf(path));
    });
  })

  it('forEach should be able to iterate through the paths in the union of two or more states', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach('modify', 'require', function (path) {
      assert.ok(~['world', 'foo'].indexOf(path));
    });
  })

  it('forEach should iterate through all paths that have any state if given no state arguments', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach(function (path) {
      assert.ok(~['hello', 'goodbye','world', 'foo'].indexOf(path));
    });
  })

  it('should be able to detect if at least one path exists in a set of states', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    assert.ok(ar.some('init'));
    assert.ok(ar.some('modify'));
    assert.ok(!ar.some('require'));
    assert.ok(ar.some('init', 'modify'));
    assert.ok(ar.some('init', 'require'));
    assert.ok(ar.some('modify', 'require'));
  })

  it('should be able to `map` over the set of paths in a given state', function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    ar.require('iAmTheWalrus');
    var suffixedPaths = ar.map('init', 'modify', function (path) {
      return path + '-suffix';
    });
    assert.deepEqual(suffixedPaths,['hello-suffix', 'world-suffix']);
  })

  it("should `map` over all states' paths if no states are specified in a `map` invocation", function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    ar.require('iAmTheWalrus');
    var suffixedPaths = ar.map(function (path) {
      return path + '-suffix';
    });
    assert.deepEqual(suffixedPaths,['iAmTheWalrus-suffix', 'hello-suffix', 'world-suffix']);
  })

  it('test utils.options', function () {
    var o = { a: 1, b: 2, c: 3, 0: 'zero1' };
    var defaults = { b: 10, d: 20, 0: 'zero2' };
    var result = utils.options(defaults, o);
    assert.equal(1, result.a);
    assert.equal(result.b,2);
    assert.equal(result.c,3);
    assert.equal(result.d,20);
    assert.deepEqual(o.d,result.d);
    assert.equal(result['0'],'zero1');

    var result2 = utils.options(defaults);
    assert.equal(result2.b, 10);
    assert.equal(result2.d, 20);
    assert.equal(result2['0'], 'zero2');

    // same properties/vals
    assert.deepEqual(defaults, result2);

    // same object
    assert.notEqual(defaults, result2);
  })

  it('test deepEquals on ObjectIds', function () {
    var s = (new ObjectId).toString();

    var a = new ObjectId(s)
      , b = new ObjectId(s);

    assert.ok(utils.deepEqual(a, b));
    assert.ok(utils.deepEqual(a, a));
    assert.ok(!utils.deepEqual(a, new ObjectId));
  })

  it('deepEquals on MongooseDocumentArray works', function () {
    var db = start()
      , A = new Schema({ a: String })
      , M = db.model('deepEqualsOnMongooseDocArray', new Schema({
            a1: [A]
          , a2: [A]
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
    assert.ok(utils.deepEqual(m1.a1, m2.a1))
  })

  // gh-688
  it('deepEquals with MongooseBuffer', function () {
    var str = "this is the day";
    var a = new MongooseBuffer(str);
    var b = new MongooseBuffer(str);
    var c = new Buffer(str);
    var d = new Buffer("this is the way");
    var e = new Buffer("other length");

    assert.ok(utils.deepEqual(a, b))
    assert.ok(utils.deepEqual(a, c))
    assert.ok(!utils.deepEqual(a, d))
    assert.ok(!utils.deepEqual(a, e))
    assert.ok(!utils.deepEqual(a, []))
    assert.ok(!utils.deepEqual([], a))
  })
})

