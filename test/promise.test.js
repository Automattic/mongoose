
/**
 * Module dependencies.
 */

var assert = require('assert')
var Promise = require('../lib/promise');

/**
 * Test.
 */

describe('promise', function(){
  it('events fire right after complete()', function(){
    var promise = new Promise()
      , called = 0;

    promise.on('complete', function (a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    promise.complete('1', '2');

    promise.on('complete', function (a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    assert.equal(2, called);
  });

  it('events first right after error()', function(){
    var promise = new Promise()
      , called = 0;

    promise.on('err', function (err) {
      assert.ok(err instanceof Error);
      called++;
    });

    promise.error(new Error('booyah'));

    promise.on('err', function (err) {
      assert.ok(err instanceof Error);
      called++;
    });

    assert.equal(2, called);
  });

  describe('errback+callback', function(){
    it('from constructor works', function(){
      var called = 0;
      var promise = new Promise(function (err) {
        assert.ok(err instanceof Error);
        called++;
      })

      promise.error(new Error('dawg'));

      assert.equal(1, called);
    });

    it('after complete()', function(){
      var promise = new Promise()
        , called = 0;

      promise.complete('woot');

      promise.addBack(function (err, data){
        assert.equal(data,'woot');
        called++;
      });

      promise.addBack(function (err, data){
        assert.strictEqual(err, null);
        called++;
      });

      assert.equal(2, called);
    })

    it('after error()', function(){
      var promise = new Promise()
        , called = 0;

      promise.error(new Error('woot'));

      promise.addBack(function (err){
        assert.ok(err instanceof Error);
        called++;
      });

      promise.addBack(function (err){
        assert.ok(err instanceof Error);
        called++;
      });
      assert.equal(2, called);
    })
  });

  describe('addCallback shortcut', function(){
    it('works', function(){
      var promise = new Promise()
        , called = 0;

      promise.addCallback(function (woot) {
        assert.strictEqual(woot, undefined);
        called++;
      });

      promise.complete();

      assert.equal(1, called);
    })
  })

  describe('addErrback shortcut', function(){
    var promise = new Promise()
      , called = 0;

    promise.addErrback(function (err) {
      assert.ok(err instanceof Error);
      called++;
    });

    promise.error(new Error);

    assert.equal(1, called);
  });

  describe('return values', function(){
    it('on()', function(){
      var promise = new Promise()
      assert.ok(promise.on('jump', function(){}) instanceof Promise);
    });

    it('addCallback()', function(){
      var promise = new Promise()
      assert.ok(promise.addCallback(function(){}) instanceof Promise);
    })
    it('addErrback()', function(){
      var promise = new Promise()
      assert.ok(promise.addErrback(function(){}) instanceof Promise);
    })
    it('addBack()', function(){
      var promise = new Promise()
      assert.ok(promise.addBack(function(){}) instanceof Promise);
    })
  })
})
