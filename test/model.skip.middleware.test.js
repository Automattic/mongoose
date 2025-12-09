'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware option to skip hooks (gh-8768)', function() {
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

  describe('Model and Query operations', function() {
    const operations = {
      // Query operations
      find: (User, options) => User.find({}, null, options),
      findOne: (User, options) => User.findOne({}, null, options),
      findOneAndUpdate: (User, options) => User.findOneAndUpdate({}, { name: 'updated' }, options),
      findOneAndDelete: (User, options) => User.findOneAndDelete({}, options),
      findOneAndReplace: (User, options) => User.findOneAndReplace({}, { name: 'replaced' }, options),
      updateOne: (User, options) => User.updateOne({}, { name: 'updated' }, options),
      updateMany: (User, options) => User.updateMany({}, { name: 'updated' }, options),
      deleteOne: (User, options) => User.deleteOne({}, options),
      deleteMany: (User, options) => User.deleteMany({}, options),
      countDocuments: (User, options) => User.countDocuments({}, options),
      replaceOne: (User, options) => User.replaceOne({}, { name: 'replaced' }, options),

      // Document operations
      save: (User, options) => new User({ name: 'John' }).save(options),
      validate: (User, options) => new User({ name: 'John' }).validate(options),

      // Model operations
      insertMany: (User, options) => User.insertMany([{ name: 'John' }], options),
      bulkWrite: (User, options) => User.bulkWrite([{ insertOne: { document: { name: 'John' } } }], options),
      aggregate: (User, options) => User.aggregate([{ $match: {} }], options)
    };

    for (const [operation, runOperation] of Object.entries(operations)) {
      describe(operation, function() {
        it('skips pre/post hooks when middleware: false', async function() {
        // Arrange
          const { User, getPreCount, getPostCount } = createTestContext(operation);

          // Act
          await runOperation(User, { middleware: false });

          // Assert
          assert.strictEqual(getPreCount(), 0);
          assert.strictEqual(getPostCount(), 0);
        });

        it('runs hooks normally without middleware option', async function() {
        // Arrange
          const { User, getPreCount, getPostCount } = createTestContext(operation);

          // Act
          await runOperation(User);

          // Assert
          assert.strictEqual(getPreCount(), 1);
          assert.strictEqual(getPostCount(), 1);
        });

        it('skips only pre hooks when middleware: { pre: false }', async function() {
        // Arrange
          const { User, getPreCount, getPostCount } = createTestContext(operation);

          // Act
          await runOperation(User, { middleware: { pre: false } });

          // Assert
          assert.strictEqual(getPreCount(), 0);
          assert.strictEqual(getPostCount(), 1);
        });

        it('skips only post hooks when middleware: { post: false }', async function() {
        // Arrange
          const { User, getPreCount, getPostCount } = createTestContext(operation);

          // Act
          await runOperation(User, { middleware: { post: false } });

          // Assert
          assert.strictEqual(getPreCount(), 1);
          assert.strictEqual(getPostCount(), 0);
        });
      });
    }

    function createTestContext(hookName) {
      const schema = new Schema({ name: String });

      let _preCount = 0;
      let _postCount = 0;

      schema.pre(hookName, function() { ++_preCount; });
      schema.post(hookName, function() { ++_postCount; });

      const User = db.model('User', schema);

      function getPreCount() {
        return _preCount;
      }

      function getPostCount() {
        return _postCount;
      }

      return { User, getPreCount, getPostCount };
    }
  });

  describe('Subdocument operations', function() {
    describe('save hooks', function() {
      it('subdocument.save() skips middleware when middleware: false', async function() {
        // Arrange
        const { Parent, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'save' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.child.save({ suppressWarning: true, middleware: false });

        // Assert
        assert.strictEqual(getSubdocPreCount(), 0);
        assert.strictEqual(getSubdocPostCount(), 0);
      });

      it('parent.save() skips both parent and subdoc middleware when middleware: false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'save' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: false });

        // Assert
        assert.strictEqual(getParentPreCount(), 0);
        assert.strictEqual(getParentPostCount(), 0);
        assert.strictEqual(getSubdocPreCount(), 0);
        assert.strictEqual(getSubdocPostCount(), 0);
      });

      it('parent.save() skips only pre middleware for parent and children when middleware.pre is false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'save' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: { pre: false } });

        // Assert
        assert.strictEqual(getParentPreCount(), 0);
        assert.strictEqual(getParentPostCount(), 1);
        assert.strictEqual(getSubdocPreCount(), 0);
        assert.strictEqual(getSubdocPostCount(), 1);
      });

      it('parent.save() skips only post middleware for parent and children when middleware.post is false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'save' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: { post: false } });

        // Assert
        assert.strictEqual(getParentPreCount(), 1);
        assert.strictEqual(getParentPostCount(), 0);
        assert.strictEqual(getSubdocPreCount(), 1);
        assert.strictEqual(getSubdocPostCount(), 0);
      });
    });

    describe('validate hooks', function() {
      it('parent.save() still runs validate middleware when middleware: false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'validate' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: false });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getParentPreCount(), 1);
        assert.strictEqual(getParentPostCount(), 1);
        assert.strictEqual(getSubdocPreCount(), 1);
        assert.strictEqual(getSubdocPostCount(), 1);
      });

      it('parent.save() still runs validate middleware when middleware.pre is false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'validate' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: { pre: false } });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getParentPreCount(), 1);
        assert.strictEqual(getParentPostCount(), 1);
        assert.strictEqual(getSubdocPreCount(), 1);
        assert.strictEqual(getSubdocPostCount(), 1);
      });

      it('parent.save() still runs validate middleware when middleware.post is false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'validate' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: { post: false } });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getParentPreCount(), 1);
        assert.strictEqual(getParentPostCount(), 1);
        assert.strictEqual(getSubdocPreCount(), 1);
        assert.strictEqual(getSubdocPostCount(), 1);
      });
    });

    function createTestContext({ hookName }) {
      const childSchema = new Schema({ name: String });
      const parentSchema = new Schema({ child: childSchema });

      let parentPreCount = 0;
      let parentPostCount = 0;
      let subdocPreCount = 0;
      let subdocPostCount = 0;

      childSchema.pre(hookName, function() { ++subdocPreCount; });
      childSchema.post(hookName, function() { ++subdocPostCount; });
      parentSchema.pre(hookName, function() { ++parentPreCount; });
      parentSchema.post(hookName, function() { ++parentPostCount; });

      const Parent = db.model('Parent', parentSchema);

      return {
        Parent,
        getParentPreCount: () => parentPreCount,
        getParentPostCount: () => parentPostCount,
        getSubdocPreCount: () => subdocPreCount,
        getSubdocPostCount: () => subdocPostCount
      };
    }
  });

  describe('Document instance operations', function() {
    it('doc.updateOne() skips middleware when middleware: false', async function() {
      // Arrange
      const { Model, getPreCount, getPostCount } = createTestContext();
      const doc = await Model.create({ x: 'test' });

      // Act
      await doc.updateOne({ y: 'updated' }, { middleware: false });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 0);
      const found = await Model.findById(doc._id);
      assert.strictEqual(found.y, 'updated');
    });

    function createTestContext() {
      const schema = new Schema({ x: String, y: String });

      let preCount = 0;
      let postCount = 0;

      schema.pre('updateOne', { document: true, query: false }, function() { ++preCount; });
      schema.post('updateOne', { document: true, query: false }, function() { ++postCount; });

      const Model = db.model('Test', schema);

      return {
        Model,
        getPreCount: () => preCount,
        getPostCount: () => postCount
      };
    }
  });

  describe('Error propagation when middleware is skipped', function() {
    it('insertMany() throws duplicate key error when post middleware is skipped', async function() {
      // Arrange
      const { User } = await createTestContext({ uniqueIndex: true });
      await User.insertMany([{ name: 'duplicate' }]);

      // Act
      const error = await User.insertMany(
        [{ name: 'duplicate' }],
        { middleware: { post: false } }
      ).then(() => null, err => err);

      // Assert
      assert.ok(error);
      assert.ok(error.message.includes('duplicate') || error.code === 11000);
    });

    it('insertMany() throws when pre-hook throws and post middleware is skipped', async function() {
      // Arrange
      const preHookError = new Error('Pre-hook error - should stop insertMany');
      const { User } = await createTestContext({
        preHook: { name: 'insertMany', fn: function() { throw preHookError; } }
      });

      // Act
      const error = await User.insertMany(
        [{ name: 'test1' }],
        { middleware: { post: false } }
      ).then(() => null, err => err);

      // Assert
      assert.ok(error);
      assert.strictEqual(error.message, preHookError.message);
    });

    it('bulkWrite() throws duplicate key error when post middleware is skipped (ordered: false)', async function() {
      // Arrange
      const { User } = await createTestContext({ uniqueIndex: true });
      await User.create({ name: 'duplicate' });

      // Act
      const error = await User.bulkWrite(
        [{ insertOne: { document: { name: 'duplicate' } } }],
        { middleware: { post: false }, ordered: false }
      ).then(() => null, err => err);

      // Assert
      assert.ok(error);
      assert.ok(error.message.includes('duplicate') || error.code === 11000);
    });

    async function createTestContext({ uniqueIndex = false, preHook = null } = {}) {
      const schema = new Schema({
        name: String
      });

      if (uniqueIndex) {
        schema.index({ name: 1 }, { unique: true });
      }

      if (preHook) {
        schema.pre(preHook.name, preHook.fn);
      }

      const User = db.model('User', schema);

      if (uniqueIndex) {
        await User.init();
      }

      return { User };
    }
  });
});
