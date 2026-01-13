'use strict';

/**
 * Test dependencies.
 */
const { builtInMiddleware } = require('../lib/schema/symbols');

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

      it('parent.save() skips validate middleware when validateBeforeSave: false, even with middleware: false', async function() {
        // Arrange
        const { Parent, getParentPreCount, getParentPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext({ hookName: 'validate' });
        const doc = new Parent({ child: { name: 'test' } });

        // Act
        await doc.save({ middleware: false, validateBeforeSave: false });

        // Assert - validateBeforeSave: false skips validation entirely, so validate hooks don't run
        assert.strictEqual(getParentPreCount(), 0);
        assert.strictEqual(getParentPostCount(), 0);
        assert.strictEqual(getSubdocPreCount(), 0);
        assert.strictEqual(getSubdocPostCount(), 0);
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

  describe('deleteOne hooks on removed subdocs', function() {
    it('parent.save() skips subdoc deleteOne pre hooks when middleware: false', async function() {
      // Arrange
      const { Parent, getSubdocPreCount } = createTestContext();
      const doc = await Parent.create({ children: [{ name: 'child1' }] });
      doc.children[0].deleteOne();

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPreCount(), 0);
    });

    it('parent.save() skips subdoc deleteOne post hooks when middleware: false', async function() {
      // Arrange
      const { Parent, getSubdocPostCount } = createTestContext();
      const doc = await Parent.create({ children: [{ name: 'child1' }] });
      doc.children[0].deleteOne();

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPostCount(), 0);
    });

    it('parent.save() skips only pre deleteOne hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { Parent, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const doc = await Parent.create({ children: [{ name: 'child1' }] });
      doc.children[0].deleteOne();

      // Act
      await doc.save({ middleware: { pre: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount(), 0);
      assert.strictEqual(getSubdocPostCount(), 1);
    });

    it('parent.save() skips only post deleteOne hooks when middleware: { post: false }', async function() {
      // Arrange
      const { Parent, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const doc = await Parent.create({ children: [{ name: 'child1' }] });
      doc.children[0].deleteOne();

      // Act
      await doc.save({ middleware: { post: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount(), 1);
      assert.strictEqual(getSubdocPostCount(), 0);
    });

    function createTestContext() {
      const childSchema = new Schema({ name: String });
      const parentSchema = new Schema({ children: [childSchema] });

      let subdocPreCount = 0;
      let subdocPostCount = 0;

      childSchema.pre('deleteOne', { document: true, query: false }, function() { ++subdocPreCount; });
      childSchema.post('deleteOne', { document: true, query: false }, function() { ++subdocPostCount; });

      const Parent = db.model('Parent', parentSchema);

      return {
        Parent,
        getSubdocPreCount: () => subdocPreCount,
        getSubdocPostCount: () => subdocPostCount
      };
    }
  });

  describe('Document instance operations', function() {
    it('doc.updateOne() skips middleware when middleware: false', async function() {
      // Arrange
      const { Model, getPreCount, getPostCount } = createTestContext({ hookName: 'updateOne' });
      const doc = await Model.create({ x: 'test' });

      // Act
      await doc.updateOne({ y: 'updated' }, { middleware: false });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 0);
      const found = await Model.findById(doc._id);
      assert.strictEqual(found.y, 'updated');
    });

    it('doc.deleteOne() skips middleware when middleware: false', async function() {
      // Arrange
      const { Model, getPreCount, getPostCount } = createTestContext({ hookName: 'deleteOne' });
      const doc = await Model.create({ x: 'test' });

      // Act
      await doc.deleteOne({ middleware: false });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 0);
    });

    it('doc.deleteOne() skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { Model, getPreCount, getPostCount } = createTestContext({ hookName: 'deleteOne' });
      const doc = await Model.create({ x: 'test' });

      // Act
      await doc.deleteOne({ middleware: { pre: false } });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 1);
    });

    it('doc.deleteOne() skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
      const { Model, getPreCount, getPostCount } = createTestContext({ hookName: 'deleteOne' });
      const doc = await Model.create({ x: 'test' });

      // Act
      await doc.deleteOne({ middleware: { post: false } });

      // Assert
      assert.strictEqual(getPreCount(), 1);
      assert.strictEqual(getPostCount(), 0);
    });

    it('doc.deleteOne() skips subdoc deleteOne hooks when middleware: false', async function() {
      // Arrange
      const { Parent, getSubdocPreCount, getSubdocPostCount } = createSubdocTestContext();
      const doc = await Parent.create({ children: [{ name: 'child1' }] });

      // Act
      await doc.deleteOne({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPreCount(), 0);
      assert.strictEqual(getSubdocPostCount(), 0);
    });

    function createTestContext({ hookName }) {
      const schema = new Schema({ x: String, y: String });

      let preCount = 0;
      let postCount = 0;

      schema.pre(hookName, { document: true, query: false }, function() { ++preCount; });
      schema.post(hookName, { document: true, query: false }, function() { ++postCount; });

      const Model = db.model('Test', schema);

      return {
        Model,
        getPreCount: () => preCount,
        getPostCount: () => postCount
      };
    }

    function createSubdocTestContext() {
      const childSchema = new Schema({ name: String });
      const parentSchema = new Schema({ children: [childSchema] });

      let subdocPreCount = 0;
      let subdocPostCount = 0;

      childSchema.pre('deleteOne', { document: true, query: false }, function() { ++subdocPreCount; });
      childSchema.post('deleteOne', { document: true, query: false }, function() { ++subdocPostCount; });

      const Parent = db.model('Parent', parentSchema);

      return {
        Parent,
        getSubdocPreCount: () => subdocPreCount,
        getSubdocPostCount: () => subdocPostCount
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

  describe('Built-in middleware still runs when user middleware is skipped', function() {
    it('save() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext({ hookName: 'save' });
      const user = new User({ name: 'test' });

      // Act
      await user.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan(), false);
      assert.ok(user.createdAt);
      assert.ok(user.updatedAt);
    });

    it('findOneAndUpdate() updates timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext({ hookName: 'findOneAndUpdate' });
      const user = await User.create({ name: 'test' });
      const originalUpdatedAt = user.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { name: 'updated' },
        { new: true, middleware: false }
      );

      // Assert
      assert.strictEqual(getUserHookRan(), false);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('bulkSave() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext({ hookName: 'save' });
      const user = new User({ name: 'test' });

      // Act
      await User.bulkSave([user], { middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan(), false);
      assert.ok(user.createdAt);
      assert.ok(user.updatedAt);
    });

    it('bulkSave() skips post hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createBulkSaveTestContext();
      const user = new User({ name: 'test' });

      // Act
      await User.bulkSave([user], { middleware: false });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 0);
    });

    it('bulkSave() skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createBulkSaveTestContext();
      const user = new User({ name: 'test' });

      // Act
      await User.bulkSave([user], { middleware: { pre: false } });

      // Assert
      assert.strictEqual(getPreCount(), 0);
      assert.strictEqual(getPostCount(), 1);
    });

    it('bulkSave() skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createBulkSaveTestContext();
      const user = new User({ name: 'test' });

      // Act
      await User.bulkSave([user], { middleware: { post: false } });

      // Assert
      assert.strictEqual(getPreCount(), 1);
      assert.strictEqual(getPostCount(), 0);
    });

    it('save() skips user hooks on subdocuments when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan, getChildHookRan } = createTestContext({ hookName: 'save' });
      const user = new User({ name: 'test', child: { name: 'child' } });

      // Act
      await user.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan(), false);
      assert.strictEqual(getChildHookRan(), false);
    });

    it('save() runs validation when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext({ hookName: 'save' });
      const user = new User({});

      // Act
      const err = await user.save({ middleware: false }).then(() => null, err => err);

      // Assert
      assert.strictEqual(getUserHookRan(), false);
      assert.ok(err);
      assert.strictEqual(err.name, 'ValidationError');
    });

    it('all internal plugins have builtInMiddleware symbol', function() {
      // Arrange - schema with built-in features but no user hooks
      const userSchema = new Schema({ name: String }, { timestamps: true, shardKey: { name: 1 } });
      db.model('Test', userSchema); // Plugins are applied at model creation

      // Act
      const pres = Array.from(userSchema.s.hooks._pres.values()).flat();
      const posts = Array.from(userSchema.s.hooks._posts.values()).flat();
      const allHooks = [...pres, ...posts];

      // Assert - all hooks should be built-in (no user hooks were added)
      const hooksWithoutSymbol = allHooks.filter(hook => !hook.fn[builtInMiddleware]);
      assert.deepStrictEqual(
        hooksWithoutSymbol.map(h => h.fn.name),
        [],
        'All internal plugin hooks should have builtInMiddleware symbol'
      );
    });

    function createTestContext({ hookName }) {
      let userHookRan = false;
      let childHookRan = false;

      const childSchema = new Schema({ name: String });
      childSchema.pre('save', function() { childHookRan = true; });

      const userSchema = new Schema({
        name: { type: String, required: true },
        child: childSchema
      }, { timestamps: true });
      userSchema.pre(hookName, function() { userHookRan = true; });

      const User = db.model('User', userSchema);

      return {
        User,
        getUserHookRan: () => userHookRan,
        getChildHookRan: () => childHookRan
      };
    }

    function createBulkSaveTestContext() {
      let preCount = 0;
      let postCount = 0;

      const userSchema = new Schema({ name: String });
      userSchema.pre('save', function() { ++preCount; });
      userSchema.post('save', function() { ++postCount; });

      const User = db.model('User', userSchema);

      return {
        User,
        getPreCount: () => preCount,
        getPostCount: () => postCount
      };
    }
  });
});
