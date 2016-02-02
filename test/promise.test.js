/**
 * Module dependencies.
 */

var assert = require('power-assert');

var Promise = require('../lib/promise');

/**
 * Test.
 */

describe('Promise', function() {
  it('events fire right after complete()', function(done) {
    var promise = new Promise(),
        called = 0;

    promise.on('fulfill', function(a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    promise.complete('1', '2');

    promise.on('fulfill', function(a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    assert.equal(2, called);
    done();
  });

  it('events fire right after error()', function(done) {
    var promise = new Promise(),
        called = 0;

    promise.on('reject', function(err) {
      assert.ok(err instanceof Error);
      called++;
    });

    promise.error('booyah');

    promise.on('reject', function(err) {
      assert.ok(err instanceof Error);
      called++;
    });

    assert.equal(2, called);
    done();
  });

  it('events fire right after reject()', function(done) {
    var promise = new Promise(),
        called = 0;

    promise.on('reject', function(err) {
      assert.equal(9, err);
      called++;
    });

    promise.reject(9);

    promise.on('reject', function(err) {
      assert.equal(9, err);
      called++;
    });

    assert.equal(2, called);
    done();
  });

  describe('onResolve()', function() {
    it('from constructor works', function(done) {
      var called = 0;

      var promise = new Promise(function(err) {
        assert.ok(err instanceof Error);
        called++;
      });

      promise.reject(new Error('dawg'));

      assert.equal(1, called);
      done();
    });

    it('after fulfill()', function(done) {
      var promise = new Promise(),
          called = 0;

      promise.fulfill('woot');

      promise.onResolve(function(err, data) {
        assert.equal(data, 'woot');
        called++;
      });

      promise.onResolve(function(err) {
        assert.strictEqual(err, null);
        called++;
      });

      assert.equal(2, called);
      done();
    });

    it('after error()', function(done) {
      var promise = new Promise(),
          called = 0;

      promise.error(new Error('woot'));

      promise.onResolve(function(err) {
        assert.ok(err instanceof Error);
        called++;
      });

      promise.onResolve(function(err) {
        assert.ok(err instanceof Error);
        called++;
      });
      assert.equal(2, called);
      done();
    });
  });

  describe('onFulfill() shortcut', function() {
    it('works', function(done) {
      var promise = new Promise(),
          called = 0;

      promise.onFulfill(function(woot) {
        assert.strictEqual(woot, undefined);
        called++;
      });

      promise.fulfill();

      assert.equal(1, called);
      done();
    });
  });

  describe('onReject shortcut', function() {
    it('works', function(done) {
      var promise = new Promise(),
          called = 0;

      promise.onReject(function(err) {
        assert.ok(err instanceof Error);
        called++;
      });

      promise.reject(new Error);
      assert.equal(1, called);
      done();
    });
  });

  describe('return values', function() {
    it('on()', function(done) {
      var promise = new Promise();
      assert.ok(promise.on('jump', function() {}) instanceof Promise);
      done();
    });

    it('onFulfill()', function(done) {
      var promise = new Promise();
      assert.ok(promise.onFulfill(function() {}) instanceof Promise);
      done();
    });
    it('onReject()', function(done) {
      var promise = new Promise();
      assert.ok(promise.onReject(function() {}) instanceof Promise);
      done();
    });
    it('onResolve()', function(done) {
      var promise = new Promise();
      assert.ok(promise.onResolve(function() {}) instanceof Promise);
      done();
    });
  });

  describe('casting errors', function() {
    describe('error()', function() {
      it('casts arguments to Error', function(done) {
        var p = new Promise(function(err) {
          assert.ok(err instanceof Error);
          assert.equal('3', err.message);
          done();
        });

        p.error(3);
      });
    });

    describe('reject()', function() {
      it('does not cast arguments to Error', function(done) {
        var p = new Promise(function(err) {
          assert.equal(3, err);
          done();
        });

        p.reject(3);
      });
    });
  });

  it('doesnt swallow exceptions (gh-3222)', function(done) {
    assert.throws(function() {
      new Promise.ES6(function() {
        throw new Error('bacon');
      });
    });
    done();
  });
});
