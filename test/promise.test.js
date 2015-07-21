
/**
 * Module dependencies.
 */

var assert = require('assert');
var start = require('./common');

var Promise = require('../lib/promise');
var PromiseProvider = require('../lib/promise_provider');
var Schema = require('../lib/schema');

/**
 * Test.
 */

describe('Promise', function(){
  it('events fire right after complete()', function(done){
    var promise = new Promise()
      , called = 0;

    promise.on('fulfill', function (a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    promise.complete('1', '2');

    promise.on('fulfill', function (a, b) {
      assert.equal(a, '1');
      assert.equal(b, '2');
      called++;
    });

    assert.equal(2, called);
    done();
  });

  it('events fire right after error()', function(done){
    var promise = new Promise()
      , called = 0;

    promise.on('reject', function (err) {
      assert.ok(err instanceof Error);
      called++;
    });

    promise.error('booyah');

    promise.on('reject', function (err) {
      assert.ok(err instanceof Error);
      called++;
    });

    assert.equal(2, called);
    done()
  });

  it('events fire right after reject()', function(done){
    var promise = new Promise()
      , called = 0;

    promise.on('reject', function (err) {
      assert.equal(9, err);
      called++;
    });

    promise.reject(9);

    promise.on('reject', function (err) {
      assert.equal(9, err);
      called++;
    });

    assert.equal(2, called);
    done()
  });

  describe('onResolve()', function(){
    it('from constructor works', function(done){
      var called = 0;

      var promise = new Promise(function (err) {
        assert.ok(err instanceof Error);
        called++;
      })

      promise.reject(new Error('dawg'));

      assert.equal(1, called);
      done();
    });

    it('after fulfill()', function(done){
      var promise = new Promise()
        , called = 0;

      promise.fulfill('woot');

      promise.onResolve(function (err, data){
        assert.equal(data,'woot');
        called++;
      });

      promise.onResolve(function (err, data){
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

      promise.onResolve(function (err){
        assert.ok(err instanceof Error);
        called++;
      });

      promise.onResolve(function (err){
        assert.ok(err instanceof Error);
        called++;
      });
      assert.equal(2, called);
      done();
    })
  });

  describe('onFulfill() shortcut', function(){
    it('works', function(done){
      var promise = new Promise()
        , called = 0;

      promise.onFulfill(function (woot) {
        assert.strictEqual(woot, undefined);
        called++;
      });

      promise.fulfill();

      assert.equal(1, called);
      done();
    })
  })

  describe('onReject shortcut', function(){
    it('works', function(done){
      var promise = new Promise()
        , called = 0;

      promise.onReject(function (err) {
        assert.ok(err instanceof Error);
        called++;
      });

      promise.reject(new Error);
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

    it('onFulfill()', function(done){
      var promise = new Promise()
      assert.ok(promise.onFulfill(function(){}) instanceof Promise);
      done();
    })
    it('onReject()', function(done){
      var promise = new Promise()
      assert.ok(promise.onReject(function(){}) instanceof Promise);
      done();
    })
    it('onResolve()', function(done){
      var promise = new Promise()
      assert.ok(promise.onResolve(function(){}) instanceof Promise);
      done();
    })
  })

  describe('casting errors', function(){
    describe('error()', function(){
      it('casts arguments to Error', function(done){
        var p = new Promise(function (err) {
          assert.ok(err instanceof Error);
          assert.equal('3', err.message);
          done();
        });

        p.error(3);
      })
    })

    describe('reject()', function(){
      it('does not cast arguments to Error', function(done){
        var p = new Promise(function (err, arg) {
          assert.equal(3, err);
          done();
        });

        p.reject(3);
      });
    });
  });
});

describe('ES6 promises: ', function() {
  describe('native: ', function() {
    if (!global.Promise) {
      return;
    }

    var Promise;
    var db;
    var testSchema = new Schema({ test: { type: String, required: true } });
    testSchema.pre('save', function(next) {
      if (this.$__saveSucceeds === false) {
        return next(new Error('fail'));
      }
      next();
    });
    testSchema.pre('validate', function(next) {
      if (this.$__validateSucceeds === false) {
        return next(new Error('validation failed'));
      }
      next();
    });
    testSchema.pre('findOne', function(next) {
      if (this.$__findOneSucceeds === false) {
        return next(new Error('findOne failed'));
      }
      next();
    });
    var MyModel;

    before(function() {
      PromiseProvider.set(global.Promise);
      Promise = PromiseProvider.get();
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise', testSchema);
    });

    after(function() {
      PromiseProvider.reset();
    });

    afterEach(function(done) {
      MyModel.remove({}, done);
    });

    it('save()', function(done) {
      var m = new MyModel({ test: '123' });
      var promise = m.save();
      assert.equal(promise.constructor, global.Promise);
      promise.then(function(doc) {
        assert.equal(m, doc);
        done();
      });
    });

    it('save() with validation error', function(done) {
      var m = new MyModel({});
      var promise = m.save();
      assert.equal(promise.constructor, global.Promise);
      promise.
        then(function(doc) {
          assert.ok(false);
        }).
        catch(function(err) {
          assert.ok(err);
          assert.ok(err.errors['test']);
          done();
        });
    });

    it('save() with middleware error', function(done) {
      var m = new MyModel({ test: '123' });
      m.$__saveSucceeds = false;
      var promise = m.save();
      assert.equal(promise.constructor, global.Promise);
      promise.
        then(function(doc) {
          assert.ok(false);
        }).
        catch(function(err) {
          assert.ok(err);
          assert.equal(err.toString(), 'Error: fail');
          done();
        });
    });

    it('save() with validation middleware error', function(done) {
      var m = new MyModel({ test: '123' });
      m.$__validateSucceeds = false;
      var promise = m.save();
      assert.equal(promise.constructor, global.Promise);
      promise.
        then(function(doc) {
          assert.ok(false);
        }).
        catch(function(err) {
          assert.ok(err);
          assert.equal(err.toString(), 'Error: validation failed');
          done();
        });
    });

    it('validate()', function(done) {
      var m = new MyModel({});
      var promise = m.validate();
      assert.equal(promise.constructor, global.Promise);
      promise.
        then(function(doc) {
          assert.ok(false);
        }).
        catch(function(err) {
          assert.ok(err);
          assert.ok(err.errors['test']);
          done();
        });
    });

    it('queries', function(done) {
      MyModel.create({ test: '123' }, function(error) {
        assert.ifError(error);

        var promise = MyModel.findOne({ test: '123' }).exec();
        assert.equal(promise.constructor, global.Promise);

        promise.then(function(doc) {
          assert.equal(doc.test, '123');
          done();
        });
      });
    });

    it('queries with errors', function(done) {
      MyModel.create({ test: '123' }, function(error) {
        assert.ifError(error);

        var query = MyModel.findOne({ test: '123' });
        query.$__findOneSucceeds = false;
        var promise = query.exec();
        assert.equal(promise.constructor, global.Promise);

        promise.
          then(function() {
            assert.ok(false);
          }).
          catch(function(err) {
            assert.ok(err);
            assert.equal(err.toString(), 'Error: findOne failed');
            done();
          });
      });
    });
  });
});
