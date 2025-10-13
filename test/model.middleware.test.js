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

    schema.pre('validate', function() {
      assert.equal(count++, 0);
    });

    schema.pre('save', function() {
      assert.equal(count++, 1);
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

    schema.pre('save', function() {
      called++;
      throw new Error('Error 101');
    });

    schema.pre('deleteOne', { document: true, query: false }, function() {
      called++;
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

    childSchema.pre('save', function() {
      childPreCallsByName[this.name] = childPreCallsByName[this.name] || 0;
      ++childPreCallsByName[this.name];
      ++childPreCalls;
    });

    const parentSchema = new mongoose.Schema({
      name: String,
      children: [childSchema]
    });

    parentSchema.pre('save', function() {
      ++parentPreCalls;
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

    schema.post('save', function postSaveTestError() {
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

  it('validate + remove', async function() {
    const schema = new Schema({
      title: String
    });

    let preValidate = 0,
        postValidate = 0,
        preRemove = 0,
        postRemove = 0;

    schema.pre('validate', function() {
      ++preValidate;
    });

    schema.pre('deleteOne', { document: true, query: false }, function() {
      ++preRemove;
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

  it('static hooks async stack traces (gh-15317) (gh-5982)', async function staticHookAsyncStackTrace() {
    const schema = new Schema({
      name: String
    });

    schema.statics.findByName = function() {
      return this.find({ otherProp: { $notAnOperator: 'value' } });
    };

    let preCalled = 0;
    schema.pre('findByName', function() {
      ++preCalled;
    });

    let postCalled = 0;
    schema.post('findByName', function() {
      ++postCalled;
    });

    const Model = db.model('Test', schema);

    await Model.create({ name: 'foo' });

    const err = await Model.findByName('foo').then(() => null, err => err);
    assert.equal(err.name, 'MongoServerError');
    assert.ok(err.stack.includes('staticHookAsyncStackTrace'));
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 0);
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

    assert.equal(queryPreCalled, 1);
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 1);

    await Model.deleteOne();

    assert.equal(queryPreCalled, 2);
    assert.equal(preCalled, 1);
    assert.equal(postCalled, 1);
  });

  describe('createCollection middleware', function() {
    it('calls createCollection hooks', async function() {
      const schema = new Schema({ name: String }, { autoCreate: true });

      const pre = [];
      const post = [];
      schema.pre('createCollection', function() {
        pre.push(this);
      });
      schema.post('createCollection', function() {
        post.push(this);
      });

      const Test = db.model('Test', schema);
      await Test.init();
      assert.equal(pre.length, 1);
      assert.equal(pre[0], Test);
      assert.equal(post.length, 1);
      assert.equal(post[0], Test);
    });

    it('allows skipping createCollection from hooks', async function() {
      const schema = new Schema({ name: String }, { autoCreate: true });

      schema.pre('createCollection', function() {
        throw mongoose.skipMiddlewareFunction();
      });

      const Test = db.model('CreateCollectionHookTest', schema);
      await Test.init();
      const collections = await db.listCollections();
      assert.equal(collections.length, 0);
    });
  });

  describe('bulkWrite middleware', function() {
    it('calls bulkWrite hooks', async function() {
      const schema = new Schema({ name: String });

      const pre = [];
      const post = [];
      schema.pre('bulkWrite', function(ops) {
        pre.push(ops);
      });
      schema.post('bulkWrite', function(res) {
        post.push(res);
      });

      const Test = db.model('Test', schema);
      await Test.bulkWrite([{
        updateOne: {
          filter: { name: 'foo' },
          update: { $set: { name: 'bar' } }
        }
      }]);
      assert.equal(pre.length, 1);
      assert.deepStrictEqual(pre[0], [{
        updateOne: {
          filter: { name: 'foo' },
          update: { $set: { name: 'bar' } }
        }
      }]);
      assert.equal(post.length, 1);
      assert.equal(post[0].constructor.name, 'BulkWriteResult');
    });

    it('allows updating ops', async function() {
      const schema = new Schema({ name: String, prop: String });

      schema.pre('bulkWrite', function(ops) {
        ops[0].updateOne.filter.name = 'baz';
      });

      const Test = db.model('Test', schema);
      const { _id } = await Test.create({ name: 'baz' });
      await Test.bulkWrite([{
        updateOne: {
          filter: { name: 'foo' },
          update: { $set: { prop: 'test prop value' } }
        }
      }]);
      const { prop } = await Test.findById(_id).orFail();
      assert.equal(prop, 'test prop value');
    });

    it('supports error handlers', async function() {
      const schema = new Schema({ name: String, prop: String });

      const errors = [];
      schema.post('bulkWrite', function(err, res, next) {
        errors.push(err);
        next();
      });

      const Test = db.model('Test', schema);
      const { _id } = await Test.create({ name: 'baz' });
      await assert.rejects(
        Test.bulkWrite([{
          insertOne: {
            document: {
              _id
            }
          }
        }]),
        /duplicate key error/
      );
      assert.equal(errors.length, 1);
      assert.equal(errors[0].name, 'MongoBulkWriteError');
      assert.ok(errors[0].message.includes('duplicate key error'), errors[0].message);
    });

    it('post save error handler gets doc as param (gh-15480)', async function() {
      const userSchema = new mongoose.Schema({
        name: String,
        arr: [String]
      });

      let postSaveErrorCalled = false;
      let postSaveErrorName = null;
      let postSaveErrorDoc = undefined;

      // Add post-save error handler
      userSchema.post('save', function(err, doc, next) {
        postSaveErrorCalled = true;
        postSaveErrorName = err && err.name;
        postSaveErrorDoc = doc;
        next();
      });

      const User = db.model('User', userSchema);

      const original = await User.create({ name: 'Alice' });
      await User.updateOne({ _id: original._id }, { $unset: { arr: 1 } });

      const docA = await User.findById(original._id);
      const docB = await User.findById(original._id);

      // Modify and save docA to bump __v
      docA.name = 'Alice A';
      await docA.save();

      // Now attempt to save docB, which has stale __v
      docB.name = 'Alice B';
      const err = await docB.save().then(() => null, err => err);
      assert.ok(err);

      assert.ok(postSaveErrorCalled, 'post save error handler should be called');
      assert.equal(postSaveErrorName, 'VersionError');
      assert.strictEqual(postSaveErrorDoc, docB);
    });

    it('supports skipping wrapped function', async function() {
      const schema = new Schema({ name: String, prop: String });

      schema.pre('bulkWrite', function() {
        throw mongoose.skipMiddlewareFunction('skipMiddlewareFunction test');
      });

      const Test = db.model('Test', schema);
      const { _id } = await Test.create({ name: 'baz' });
      const res = await Test.bulkWrite([{
        insertOne: {
          document: {
            _id
          }
        }
      }]);
      assert.strictEqual(res, 'skipMiddlewareFunction test');
    });
  });
});
