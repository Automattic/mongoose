/* eslint no-unused-vars: 1 */

/**
 * Module dependencies.
 */

var assert = require('assert');
var bluebird = require('bluebird');
var q = require('q');
var start = require('./common');

var PromiseProvider = require('../lib/promise_provider');
var Schema = require('../lib/schema');

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

describe('ES6 promises: ', function() {
  describe('native: ', function() {
    if (!global.Promise) {
      return;
    }

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
        then(function() {
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
        then(function() {
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
        then(function() {
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
        then(function() {
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

    it('create', function(done) {
      var promise = MyModel.create({ test: '123' });
      assert.equal(promise.constructor, global.Promise);
      promise.then(function() {
        done();
      });
    });
  });

  describe('bluebird: ', function() {
    before(function() {
      PromiseProvider.set(bluebird);
      Promise = PromiseProvider.get();
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise_bluebird', testSchema);
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
      assert.equal(promise.constructor, bluebird);
      promise.then(function(doc) {
        assert.equal(m, doc);
        done();
      });
    });

    it('save() with validation error', function(done) {
      var m = new MyModel({});
      var promise = m.save();
      assert.equal(promise.constructor, bluebird);
      promise.
        then(function() {
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
      assert.equal(promise.constructor, bluebird);
      promise.
        then(function() {
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
      assert.equal(promise.constructor, bluebird);
      promise.
        then(function() {
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
      assert.equal(promise.constructor, bluebird);
      promise.
        then(function() {
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
        assert.equal(promise.constructor, bluebird);

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
        assert.equal(promise.constructor, bluebird);

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

    it('create', function(done) {
      var promise = MyModel.create({ test: '123' });
      assert.equal(promise.constructor, bluebird);
      promise.then(function() {

        var p = MyModel.create({});
        p.catch(function(error) {
          assert.ok(error);
          done();
        });
      });
    });
  });

  describe('q: ', function() {
    before(function() {
      PromiseProvider.set(q.Promise);
      Promise = PromiseProvider.get();
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise_q', testSchema);
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
      assert.ok(promise instanceof q.makePromise);
      promise.then(function(doc) {
        assert.equal(m, doc);
        done();
      });
    });

    it('save() with validation error', function(done) {
      var m = new MyModel({});
      var promise = m.save();
      assert.ok(promise instanceof q.makePromise);
      promise.
        then(function() {
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
      assert.ok(promise instanceof q.makePromise);
      promise.
        then(function() {
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
      assert.ok(promise instanceof q.makePromise);
      promise.
        then(function() {
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
      assert.ok(promise instanceof q.makePromise);
      promise.
        then(function() {
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
        assert.ok(promise instanceof q.makePromise);

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
        assert.ok(promise instanceof q.makePromise);

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

    it('create', function(done) {
      var promise = MyModel.create({ test: '123' });
      assert.ok(promise instanceof q.makePromise);
      promise.then(function() {
        done();
      });
    });
  });
});
