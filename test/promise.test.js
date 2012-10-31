
/**
 * Module dependencies.
 */

var assert = require('assert')
var Promise = require('../lib/promise');

/**
 * Test.
 */

describe('promise', function(){
  it('events fire right after complete()', function(done){
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
    done();
  });

  it('events first right after error()', function(done){
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
    done()
  });

  describe('errback+callback', function(){
    it('from constructor works', function(done){
      var called = 0;
      var promise = new Promise(function (err) {
        assert.ok(err instanceof Error);
        called++;
      })

      promise.error(new Error('dawg'));

      assert.equal(1, called);
      done();
    });

    it('after complete()', function(done){
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
      done();
    })

    it('after error()', function(done){
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
      done();
    })
  });

  describe('addCallback shortcut', function(){
    it('works', function(done){
      var promise = new Promise()
        , called = 0;

      promise.addCallback(function (woot) {
        assert.strictEqual(woot, undefined);
        called++;
      });

      promise.complete();

      assert.equal(1, called);
      done();
    })
  })

  describe('addErrback shortcut', function(){
    it('works', function(done){
      var promise = new Promise()
        , called = 0;

      promise.addErrback(function (err) {
        assert.ok(err instanceof Error);
        called++;
      });

      promise.error(new Error);
      assert.equal(1, called);
      done();
    })
  });

  describe('return values', function(){
    it('on()', function(done){
      var promise = new Promise()
      assert.ok(promise.on('jump', function(){}) instanceof Promise);
      done()
    });

    it('addCallback()', function(done){
      var promise = new Promise()
      assert.ok(promise.addCallback(function(){}) instanceof Promise);
      done();
    })
    it('addErrback()', function(done){
      var promise = new Promise()
      assert.ok(promise.addErrback(function(){}) instanceof Promise);
      done();
    })
    it('addBack()', function(done){
      var promise = new Promise()
      assert.ok(promise.addBack(function(){}) instanceof Promise);
      done();
    })
  })
})
