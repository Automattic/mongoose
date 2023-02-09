'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model middleware', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('post save', async function() {
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

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Little Green Running Hood' });

    await test.save();

    assert.equal(test.title, 'Little Green Running Hood');
    assert.equal(called, 3);
  });

  it('sync error in post save (gh-3483)', async function() {
    const schema = new Schema({
      title: String
    });

    schema.post('save', function() {
      throw new Error('woops!');
    });

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Test' });

    await test.save().catch(err => {
      assert.ok(err);
      assert.equal(err.message, 'woops!');
    });
  });

  it('pre hook promises (gh-3779)', async function() {
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

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Test' });

    await test.save();
    assert.equal(calledPre, 1);
  });

  it('post hook promises (gh-3779)', async function() {
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

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Test' });

    const doc = await test.save();

    assert.equal(doc.title, 'From Post Save');
  });

  it('validate middleware runs before save middleware (gh-2462)', async() => {
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

    const Book = db.model('Test', schema);

    await Book.create({});
    assert.equal(count, 2);
  });

  it('works', async function() {
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

    schema.pre('deleteOne', { document: true, query: false }, function(next) {
      called++;
      next();
    });

    const TestMiddleware = db.model('TestMiddleware', schema);

    const test = new TestMiddleware();

    await test.init({ title: 'Test' });
    assert.equal(called, 1);

    try {
      await test.save();

      assert.ok(false);
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'Error 101');
      assert.equal(called, 2);
    }

    await test.deleteOne();
    assert.equal(called, 3);
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

      const Test = db.model('Test', schema);

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

      const Test = db.model('Test', schema);

      return Test.create({ title: 'Casino Royale' }).
        then(doc => Test.findById(doc)).
        catch(error => assert.equal(error.message, 'will show'));
    });
  });

  it('gh-1829', async function() {
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

    const Parent = db.model('Parent', parentSchema);

    const parent = new Parent({
      name: 'Han',
      children: [
        { name: 'Jaina' },
        { name: 'Jacen' }
      ]
    });

    await parent.save();

    assert.equal(childPreCalls, 2);
    assert.equal(childPreCallsByName.Jaina, 1);
    assert.equal(childPreCallsByName.Jacen, 1);
    assert.equal(parentPreCalls, 1);

    parent.children[0].name = 'Anakin';

    await parent.save();

    assert.equal(childPreCalls, 4);
    assert.equal(childPreCallsByName.Anakin, 1);
    assert.equal(childPreCallsByName.Jaina, 1);
    assert.equal(childPreCallsByName.Jacen, 2);

    assert.equal(parentPreCalls, 2);
  });

  it('sync error in pre save (gh-3483)', async function() {
    const schema = new Schema({
      title: String
    });

    schema.post('save', function() {
      throw new Error('woops!');
    });

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Test' });

    try {
      await test.save();

      throw new Error('Should not get here');
    } catch (err) {
      assert.ok(err);
      assert.equal(err.message, 'woops!');
    }
  });

  it('sync error in pre save after next() (gh-3483)', async function() {
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

    const TestMiddleware = db.model('Test', schema);

    const test = new TestMiddleware({ title: 'Test' });

    await test.save();
    assert.equal(called, 1);
  });

  it('validate + remove', async function() {
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

    schema.pre('deleteOne', { document: true, query: false }, function(next) {
      ++preRemove;
      next();
    });

    schema.post('validate', function(doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postValidate;
    });

    schema.post('deleteOne', { document: true, query: false }, function(doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postRemove;
    });

    const Test = db.model('Test', schema);

    const test = new Test({ title: 'banana' });

    await test.save();
    assert.equal(preValidate, 1);
    assert.equal(postValidate, 1);
    assert.equal(preRemove, 0);
    assert.equal(postRemove, 0);

    await test.deleteOne();
    assert.equal(preValidate, 1);
    assert.equal(postValidate, 1);
    assert.equal(preRemove, 1);
    assert.equal(postRemove, 1);
  });

  it('static hooks (gh-5982)', async function() {
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

    const Model = db.model('Test', schema);

    await Model.create({ name: 'foo' });

    const docs = await Model.findByName('foo');
    assert.equal(docs.length, 1);
    assert.equal(docs[0].name, 'foo');
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 1);
  });

  it('deleteOne hooks (gh-7538)', async function() {
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

    const Model = db.model('Test', schema);

    await Model.create({ name: 'foo' });

    const doc = await Model.findOne();

    assert.equal(preCalled, 0);
    assert.equal(postCalled, 0);

    await doc.deleteOne();

    assert.equal(queryPreCalled, 0);
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 1);

    await Model.deleteOne();

    assert.equal(queryPreCalled, 1);
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 1);
  });
});
