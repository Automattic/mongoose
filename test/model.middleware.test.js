'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model middleware', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('post save', function(done) {
    const schema = new Schema({
      title: String
    });

    let called = 0;

    schema.post('save', function(obj) {
      assert.equal(obj.title, 'Little Green Running Hood');
      assert.equal(this.title, 'Little Green Running Hood');
      assert.equal(called, 0);
      called++;
    });

    schema.post('save', function(obj) {
      assert.equal(obj.title, 'Little Green Running Hood');
      assert.equal(this.title, 'Little Green Running Hood');
      assert.equal(called, 1);
      called++;
    });

    schema.post('save', function(obj, next) {
      assert.equal(obj.title, 'Little Green Running Hood');
      assert.equal(called, 2);
      called++;
      next();
    });

    const TestMiddleware = db.model('TestPostSaveMiddleware', schema);

    const test = new TestMiddleware({title: 'Little Green Running Hood'});

    test.save(function(err) {
      assert.ifError(err);
      assert.equal(test.title, 'Little Green Running Hood');
      assert.equal(called, 3);
      done();
    });
  });

  it('sync error in post save (gh-3483)', function(done) {
    const schema = new Schema({
      title: String
    });

    schema.post('save', function() {
      throw new Error('woops!');
    });

    const TestMiddleware = db.model('gh3483_post', schema);

    const test = new TestMiddleware({ title: 'Test' });

    test.save(function(err) {
      assert.ok(err);
      assert.equal(err.message, 'woops!');
      done();
    });
  });

  it('pre hook promises (gh-3779)', function(done) {
    const schema = new Schema({
      title: String
    });

    let calledPre = 0;
    schema.pre('save', function() {
      return new Promise(resolve => {
        setTimeout(() => {
          ++calledPre;
          resolve();
        }, 100);
      });
    });

    const TestMiddleware = db.model('gh3779_pre', schema);

    const test = new TestMiddleware({ title: 'Test' });

    test.save(function(err) {
      assert.ifError(err);
      assert.equal(calledPre, 1);
      done();
    });
  });

  it('post hook promises (gh-3779)', function(done) {
    const schema = new Schema({
      title: String
    });

    schema.post('save', function(doc) {
      return new Promise(resolve => {
        setTimeout(() => {
          doc.title = 'From Post Save';
          resolve();
        }, 100);
      });
    });

    const TestMiddleware = db.model('gh3779_post', schema);

    const test = new TestMiddleware({ title: 'Test' });

    test.save(function(err, doc) {
      assert.ifError(err);
      assert.equal(doc.title, 'From Post Save');
      done();
    });
  });

  it('validate middleware runs before save middleware (gh-2462)', function(done) {
    const schema = new Schema({
      title: String
    });
    let count = 0;

    schema.pre('validate', function(next) {
      assert.equal(count++, 0);
      next();
    });

    schema.pre('save', function(next) {
      assert.equal(count++, 1);
      next();
    });

    const Book = db.model('gh2462', schema);

    Book.create({}, function() {
      assert.equal(count, 2);
      done();
    });
  });

  it('works', function(done) {
    const schema = new Schema({
      title: String
    });

    let called = 0;

    schema.pre('init', function() {
      called++;
    });

    schema.pre('save', function(next) {
      called++;
      next(new Error('Error 101'));
    });

    schema.pre('remove', function(next) {
      called++;
      next();
    });

    mongoose.model('TestMiddleware', schema);

    const TestMiddleware = db.model('TestMiddleware');

    const test = new TestMiddleware();

    test.init({ title: 'Test' }, function(err) {
      assert.ifError(err);
      assert.equal(called, 1);

      test.save(function(err) {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'Error 101');
        assert.equal(called, 2);

        test.remove(function(err) {
          assert.ifError(err);
          assert.equal(called, 3);
          done();
        });
      });
    });
  });

  describe('post init hooks', function() {
    it('success', function() {
      const schema = new Schema({ title: String, loadedAt: Date });

      schema.pre('init', pojo => {
        assert.equal(pojo.constructor.name, 'Object'); // Plain object before init
      });

      const now = new Date();
      schema.post('init', doc => {
        assert.ok(doc instanceof mongoose.Document); // Mongoose doc after init
        doc.loadedAt = now;
      });

      const Test = db.model('TestPostInitMiddleware', schema);

      return Test.create({ title: 'Casino Royale' }).
        then(doc => Test.findById(doc)).
        then(doc => assert.equal(doc.loadedAt.valueOf(), now.valueOf()));
    });

    it('with errors', function() {
      const schema = new Schema({ title: String });

      const swallowedError = new Error('will not show');
      // acquit:ignore:start
      swallowedError.$expected = true;
      // acquit:ignore:end
      // init hooks do **not** handle async errors or any sort of async behavior
      schema.pre('init', () => Promise.reject(swallowedError));
      schema.post('init', () => { throw Error('will show'); });

      const Test = db.model('PostInitBook', schema);

      return Test.create({ title: 'Casino Royale' }).
        then(doc => Test.findById(doc)).
        catch(error => assert.equal(error.message, 'will show'));
    });
  });

  it('gh-1829', function(done) {
    const childSchema = new mongoose.Schema({
      name: String
    });

    let childPreCalls = 0;
    const childPreCallsByName = {};
    let parentPreCalls = 0;

    childSchema.pre('save', function(next) {
      childPreCallsByName[this.name] = childPreCallsByName[this.name] || 0;
      ++childPreCallsByName[this.name];
      ++childPreCalls;
      next();
    });

    const parentSchema = new mongoose.Schema({
      name: String,
      children: [childSchema]
    });

    parentSchema.pre('save', function(next) {
      ++parentPreCalls;
      next();
    });

    const Parent = db.model('gh-1829', parentSchema, 'gh-1829');

    const parent = new Parent({
      name: 'Han',
      children: [
        {name: 'Jaina'},
        {name: 'Jacen'}
      ]
    });

    parent.save(function(error) {
      assert.ifError(error);
      assert.equal(childPreCalls, 2);
      assert.equal(childPreCallsByName.Jaina, 1);
      assert.equal(childPreCallsByName.Jacen, 1);
      assert.equal(parentPreCalls, 1);
      parent.children[0].name = 'Anakin';
      parent.save(function(error) {
        assert.ifError(error);
        assert.equal(childPreCalls, 4);
        assert.equal(childPreCallsByName.Anakin, 1);
        assert.equal(childPreCallsByName.Jaina, 1);
        assert.equal(childPreCallsByName.Jacen, 2);

        assert.equal(parentPreCalls, 2);
        done();
      });
    });
  });

  it('sync error in pre save (gh-3483)', function(done) {
    const schema = new Schema({
      title: String
    });

    schema.post('save', function() {
      throw new Error('woops!');
    });

    const TestMiddleware = db.model('gh3483_pre', schema);

    const test = new TestMiddleware({ title: 'Test' });

    test.save(function(err) {
      assert.ok(err);
      assert.equal(err.message, 'woops!');
      done();
    });
  });

  it('sync error in pre save after next() (gh-3483)', function(done) {
    const schema = new Schema({
      title: String
    });

    let called = 0;

    schema.pre('save', function(next) {
      next();
      // This error will not get reported, because you already called next()
      throw new Error('woops!');
    });

    schema.pre('save', function(next) {
      ++called;
      next();
    });

    const TestMiddleware = db.model('gh3483_pre_2', schema);

    const test = new TestMiddleware({ title: 'Test' });

    test.save(function(error) {
      assert.ifError(error);
      assert.equal(called, 1);
      done();
    });
  });

  it('validate + remove', function(done) {
    const schema = new Schema({
      title: String
    });

    let preValidate = 0,
        postValidate = 0,
        preRemove = 0,
        postRemove = 0;

    schema.pre('validate', function(next) {
      ++preValidate;
      next();
    });

    schema.pre('remove', function(next) {
      ++preRemove;
      next();
    });

    schema.post('validate', function(doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postValidate;
    });

    schema.post('remove', function(doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postRemove;
    });

    const Test = db.model('TestPostValidateMiddleware', schema);

    const test = new Test({title: 'banana'});

    test.save(function(err) {
      assert.ifError(err);
      assert.equal(preValidate, 1);
      assert.equal(postValidate, 1);
      assert.equal(preRemove, 0);
      assert.equal(postRemove, 0);
      test.remove(function(err) {
        assert.ifError(err);
        assert.equal(preValidate, 1);
        assert.equal(postValidate, 1);
        assert.equal(preRemove, 1);
        assert.equal(postRemove, 1);
        done();
      });
    });
  });

  it('static hooks (gh-5982)', function() {
    const schema = new Schema({
      name: String
    });

    schema.statics.findByName = function(name) {
      return this.find({ name: name });
    };

    let preCalled = 0;
    schema.pre('findByName', function() {
      ++preCalled;
    });

    let postCalled = 0;
    schema.post('findByName', function(docs) {
      ++postCalled;
      assert.equal(docs.length, 1);
      assert.equal(docs[0].name, 'foo');
    });

    const Model = db.model('gh5982', schema);

    return co(function*() {
      yield Model.create({ name: 'foo' });

      const docs = yield Model.findByName('foo');
      assert.equal(docs.length, 1);
      assert.equal(docs[0].name, 'foo');
      assert.equal(preCalled, 1);
      assert.equal(postCalled, 1);
    });
  });

  it('deleteOne hooks (gh-7538)', function() {
    const schema = new Schema({
      name: String
    });

    let queryPreCalled = 0;
    let preCalled = 0;
    schema.pre('deleteOne', { document: false, query: true }, function() {
      ++queryPreCalled;
    });
    schema.pre('deleteOne', { document: true, query: false }, function() {
      ++preCalled;
    });

    let postCalled = 0;
    schema.post('deleteOne', { document: true, query: false }, function() {
      assert.equal(this.name, 'foo');
      ++postCalled;
    });

    const Model = db.model('gh7538', schema);

    return co(function*() {
      yield Model.create({ name: 'foo' });

      const doc = yield Model.findOne();

      assert.equal(preCalled, 0);
      assert.equal(postCalled, 0);

      yield doc.deleteOne();

      assert.equal(queryPreCalled, 0);
      assert.equal(preCalled, 1);
      assert.equal(postCalled, 1);

      yield Model.deleteOne();

      assert.equal(queryPreCalled, 1);
      assert.equal(preCalled, 1);
      assert.equal(postCalled, 1);
    });
  });
});
