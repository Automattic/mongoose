'use strict';

const start = require('./common');
const assert = require('assert');
const sinon = require('sinon');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware collections', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('syncIndexes collection middleware', function() {
    it('forwards selection without passing index options to collection hooks', async function() {
      const { User, calls, hookOptions } = await createTestContext();
      const options = { autoCreate: true, hideIndexes: false, middleware: { post: false } };
      const originalOptions = { ...options };

      const dropped = await User.syncIndexes(options);

      assert.deepStrictEqual(dropped, []);
      assert.strictEqual((await db.db.listCollections({ name: User.collection.name }).toArray()).length, 1);
      assert.deepStrictEqual((await User.listIndexes()).map(index => index.name).sort(), ['_id_', 'name_1']);
      assert.deepStrictEqual(options, originalOptions);
      for (const options of hookOptions) {
        assert.ok(options == null || Object.keys(options).length === 0);
      }
      assert.deepStrictEqual(calls, { pre: 1, post: 0 });
    });

    it('uses schema autoCreate with collection middleware selection', async function() {
      const { User, calls } = await createTestContext();
      User.schema.options.autoCreate = true;

      const dropped = await User.syncIndexes({ middleware: false });

      assert.deepStrictEqual(dropped, []);
      assert.ok((await User.listIndexes()).some(index => index.name === 'name_1'));
      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
    });

    it('respects disabled autoCreate with middleware enabled', async function() {
      const { User, calls } = await createTestContext();
      await User.collection.insertOne({ name: 'Ann' });

      const dropped = await User.syncIndexes({ autoCreate: false, middleware: true });

      assert.deepStrictEqual(dropped, []);
      assert.ok((await User.listIndexes()).some(index => index.name === 'name_1'));
      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
    });

    it('preserves omitted collection options when middleware is undefined', async function() {
      const { User, calls, hookOptions } = await createTestContext();

      await User.syncIndexes({ autoCreate: true, middleware: undefined });

      assert.deepStrictEqual(hookOptions, [undefined]);
      assert.deepStrictEqual(calls, { pre: 1, post: 1 });
    });

    it('propagates collection hook errors before building indexes', async function() {
      const error = new Error('Cannot create the user collection');
      const { User, calls } = await createTestContext({ error });

      const result = await User.syncIndexes({ autoCreate: true, middleware: { post: false } }).catch(err => err);

      assert.strictEqual(result, error);
      assert.deepStrictEqual(calls, { pre: 1, post: 0 });
      assert.deepStrictEqual(await db.db.listCollections({ name: User.collection.name }).toArray(), []);
    });

    it('forwards collection selection through connection syncIndexes', async function() {
      const { User, calls } = await createTestContext();

      const result = await db.syncIndexes({ autoCreate: true, continueOnError: true, middleware: { pre: false } });

      assert.deepStrictEqual(result, { User: [] });
      assert.ok((await User.listIndexes()).some(index => index.name === 'name_1'));
      assert.deepStrictEqual(calls, { pre: 0, post: 1 });
    });

    async function createTestContext({ error } = {}) {
      const calls = { pre: 0, post: 0 };
      const hookOptions = [];
      const schema = new Schema({ name: { type: String, index: true }, age: Number }, {
        autoCreate: false,
        autoIndex: false
      });
      schema.pre('createCollection', function(options) {
        ++calls.pre;
        hookOptions.push(options);
        if (error) {
          throw error;
        }
      });
      schema.post('createCollection', function() { ++calls.post; });
      const User = db.model('User', schema);
      await User.init();
      return { User, calls, hookOptions };
    }
  });

  describe('connection collection middleware', function() {
    it('forwards selection to every model without affecting later calls', async function() {
      const { models, calls } = createTestContext();

      const result = await db.createCollections({ middleware: { pre: false }, continueOnError: true });

      const collections = await db.db.listCollections().toArray();
      for (const model of models) {
        assert.strictEqual(result[model.modelName], model.collection);
        assert.ok(collections.some(collection => collection.name === model.collection.name));
        assert.deepStrictEqual(calls[model.modelName], { pre: 0, post: 1 });
      }
      await db.createCollections();
      for (const model of models) {
        assert.deepStrictEqual(calls[model.modelName], { pre: 1, post: 2 });
      }
    });

    for (const options of [{}, { middleware: undefined }]) {
      it(`omits unspecified middleware from hook and driver options (${Object.hasOwn(options, 'middleware')})`, async function() {
        const { hookOptions } = createTestContext();
        const createCollection = sinon.spy(db, 'createCollection');
        try {
          await db.createCollections(options);

          assert.deepStrictEqual(hookOptions, [{}, {}]);
          assert.deepStrictEqual(createCollection.args.map(args => args[1]), [{}, {}]);
        } finally {
          createCollection.restore();
        }
      });
    }

    for (const continueOnError of [false, true]) {
      it(`preserves collection errors with continueOnError ${continueOnError}`, async function() {
        const error = new Error('Cannot create the user collection');
        const { models, calls } = createTestContext({ error });

        const result = await db.createCollections({ continueOnError, middleware: { post: false } }).catch(err => err);

        if (continueOnError) {
          assert.strictEqual(result.User, error);
          assert.strictEqual(result.Team, models[1].collection);
          assert.deepStrictEqual(calls.Team, { pre: 1, post: 0 });
        } else {
          assert.strictEqual(result.name, 'CreateCollectionsError');
          assert.strictEqual(result.errors.User, error);
          assert.deepStrictEqual(calls.Team, { pre: 0, post: 0 });
        }
        assert.deepStrictEqual(calls.User, { pre: 1, post: 0 });
      });
    }

    function createTestContext({ error } = {}) {
      const calls = {};
      const hookOptions = [];
      const models = ['User', 'Team'].map(name => {
        calls[name] = { pre: 0, post: 0 };
        const schema = new Schema({ name: String }, { autoCreate: false, autoIndex: false });
        schema.pre('createCollection', function(options) {
          hookOptions.push(options);
          ++calls[name].pre;
          assert.ok(!Object.hasOwn(options, 'continueOnError'));
          if (name === 'User' && error) {
            throw error;
          }
        });
        schema.post('createCollection', function() { ++calls[name].post; });
        return db.model(name, schema);
      });
      return { models, calls, hookOptions };
    }
  });
});
