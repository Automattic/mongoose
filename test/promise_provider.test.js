/**
 * Module dependencies.
 */

var assert = require('power-assert');
var bluebird = require('bluebird');
var q = require('q');
var start = require('./common');

var PromiseProvider = require('../lib/promise_provider');
var Schema = require('../lib/schema');

var db;

describe('ES6 promises: ', function() {
  var testSchema;
  var MyModel;

  before(function() {
    testSchema = new Schema({test: {type: String, required: true}});
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
  });

  describe('native: ', function() {
    if (!global.Promise) {
      return;
    }

    before(function() {
      PromiseProvider.set(global.Promise);
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise', testSchema);
    });

    after(function(done) {
      PromiseProvider.reset();
      db.close(done);
    });

    afterEach(function(done) {
      MyModel.remove({}, done);
    });

    it('save()', function(done) {
      var m = new MyModel({test: '123'});
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
          assert.ok(err.errors.test);
          done();
        });
    });

    it('save() with middleware error', function(done) {
      var m = new MyModel({test: '123'});
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
      var m = new MyModel({test: '123'});
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
          assert.ok(err.errors.test);
          done();
        });
    });

    it('queries', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var promise = MyModel.findOne({test: '123'}).exec();
        assert.equal(promise.constructor, global.Promise);

        promise.then(function(doc) {
          assert.equal(doc.test, '123');
          done();
        });
      });
    });

    it('queries with errors', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var query = MyModel.findOne({test: '123'});
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
      var promise = MyModel.create({test: '123'});
      assert.equal(promise.constructor, global.Promise);
      promise.then(function() {
        done();
      });
    });
  });

  describe('bluebird: ', function() {
    before(function() {
      PromiseProvider.set(bluebird);
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise_bluebird', testSchema);
    });

    after(function(done) {
      PromiseProvider.reset();
      db.close(done);
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
        m.test = '456';
        m.save(function(error, doc, numAffected) {
          assert.ifError(error);
          assert.ok(doc);
          assert.equal(numAffected, 1);
          done();
        });
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
          assert.ok(err.errors.test);
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

          // Shouldn't log an unhandled rejection error
          m.save(function(err) {
            assert.ok(err);
            assert.equal(err.toString(), 'Error: fail');
            done();
          });
        });
    });

    it('save() with validation middleware error', function(done) {
      var m = new MyModel({test: '123'});
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
          assert.ok(err.errors.test);
          done();
        });
    });

    it('queries', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var promise = MyModel.findOne({test: '123'}).exec();
        assert.equal(promise.constructor, bluebird);

        promise.then(function(doc) {
          assert.equal(doc.test, '123');
          done();
        });
      });
    });

    it('queries with errors', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var query = MyModel.findOne({test: '123'});
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

    it('no unhandled rejection on query w/ cb (gh-4379)', function(done) {
      var query = MyModel.findOne({test: '123'});
      query.$__findOneSucceeds = false;
      query.exec(function(error) {
        assert.ok(error);
        done();
      });
    });

    it('create', function(done) {
      var promise = MyModel.create({test: '123'});
      assert.equal(promise.constructor, bluebird);
      promise.then(function() {
        var p = MyModel.create({});
        p.catch(function(error) {
          assert.ok(error);
          done();
        });
      });
    });

    it('subdocument validation (gh-3681)', function(done) {
      var subSchema = new Schema({name: {type: String, required: true}});
      var parentSchema = new Schema({sub: [subSchema]});
      var Parent = db.model('gh3681', parentSchema);

      Parent.create({sub: [{}]}).catch(function() {
        done();
      });
    });

    it('Model.populate (gh-3734)', function(done) {
      var doc = new MyModel({});
      var promise = MyModel.populate(doc, 'test');
      assert.equal(promise.constructor, bluebird);
      done();
    });

    it('gh-4177', function(done) {
      var subSchema = new Schema({
        name: { type: String, required: true }
      });

      var mainSchema = new Schema({
        name: String,
        type: String,
        children: [subSchema]
      });

      mainSchema.index({ name: 1, account: 1 }, { unique: true });

      var Main = db.model('gh4177', mainSchema);

      Main.on('index', function(error) {
        assert.ifError(error);

        var data = {
          name: 'foo',
          type: 'bar',
          children: [{ name: 'child' }]
        };

        var firstSucceeded = false;
        new Main(data).
          save().
          then(function() {
            firstSucceeded = true;
            return new Main(data).save();
          }).
          catch(function(error) {
            assert.ok(firstSucceeded);
            assert.ok(error.toString().indexOf('E11000') !== -1);
            done();
          });
      });
    });

    it('subdoc pre doesnt cause unhandled rejection (gh-3669)', function(done) {
      var nestedSchema = new Schema({
        name: {type: String, required: true}
      });

      nestedSchema.pre('validate', function(next) {
        next();
      });

      var schema = new Schema({
        items: [nestedSchema]
      });

      var MyModel = db.model('gh3669', schema);

      MyModel.create({items: [{name: null}]}).catch(function(error) {
        assert.ok(error);
        done();
      });
    });
  });

  describe('q: ', function() {
    before(function() {
      PromiseProvider.set(q.Promise);
    });

    before(function() {
      db = start();
      MyModel = db.model('es6promise_q', testSchema);
    });

    after(function(done) {
      PromiseProvider.reset();
      db.close(done);
    });

    afterEach(function(done) {
      MyModel.remove({}, done);
    });

    it('save()', function(done) {
      var m = new MyModel({test: '123'});
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
          assert.ok(err.errors.test);
          done();
        });
    });

    it('save() with middleware error', function(done) {
      var m = new MyModel({test: '123'});
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
      var m = new MyModel({test: '123'});
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
          assert.ok(err.errors.test);
          done();
        });
    });

    it('queries', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var promise = MyModel.findOne({test: '123'}).exec();
        assert.ok(promise instanceof q.makePromise);

        promise.then(function(doc) {
          assert.equal(doc.test, '123');
          done();
        });
      });
    });

    it('queries with errors', function(done) {
      MyModel.create({test: '123'}, function(error) {
        assert.ifError(error);

        var query = MyModel.findOne({test: '123'});
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
      var promise = MyModel.create({test: '123'});
      assert.ok(promise instanceof q.makePromise);
      promise.then(function() {
        done();
      });
    });
  });
});
