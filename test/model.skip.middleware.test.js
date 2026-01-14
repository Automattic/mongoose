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
          const { User, getPreCount, getPostCount } = createTestContext();

          // Act
          await runOperation(User, { middleware: false });

          // Assert
          assert.strictEqual(getPreCount(operation), 0);
          assert.strictEqual(getPostCount(operation), 0);
        });

        it('runs hooks normally without middleware option', async function() {
          // Arrange
          const { User, getPreCount, getPostCount } = createTestContext();

          // Act
          await runOperation(User);

          // Assert
          assert.strictEqual(getPreCount(operation), 1);
          assert.strictEqual(getPostCount(operation), 1);
        });

        it('skips only pre hooks when middleware: { pre: false }', async function() {
          // Arrange
          const { User, getPreCount, getPostCount } = createTestContext();

          // Act
          await runOperation(User, { middleware: { pre: false } });

          // Assert
          assert.strictEqual(getPreCount(operation), 0);
          assert.strictEqual(getPostCount(operation), 1);
        });

        it('skips only post hooks when middleware: { post: false }', async function() {
          // Arrange
          const { User, getPreCount, getPostCount } = createTestContext();

          // Act
          await runOperation(User, { middleware: { post: false } });

          // Assert
          assert.strictEqual(getPreCount(operation), 1);
          assert.strictEqual(getPostCount(operation), 0);
        });
      });
    }
  });

  describe('Subdocument operations', function() {
    describe('save hooks', function() {
      it('subdocument.save() skips middleware when middleware: false', async function() {
        // Arrange
        const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.address.save({ suppressWarning: true, middleware: false });

        // Assert
        assert.strictEqual(getSubdocPreCount('save'), 0);
        assert.strictEqual(getSubdocPostCount('save'), 0);
      });

      it('parent.save() skips both parent and subdoc middleware when middleware: false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: false });

        // Assert
        assert.strictEqual(getPreCount('save'), 0);
        assert.strictEqual(getPostCount('save'), 0);
        assert.strictEqual(getSubdocPreCount('save'), 0);
        assert.strictEqual(getSubdocPostCount('save'), 0);
      });

      it('parent.save() skips only pre middleware for parent and subdocs when middleware.pre is false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: { pre: false } });

        // Assert
        assert.strictEqual(getPreCount('save'), 0);
        assert.strictEqual(getPostCount('save'), 1);
        assert.strictEqual(getSubdocPreCount('save'), 0);
        assert.strictEqual(getSubdocPostCount('save'), 1);
      });

      it('parent.save() skips only post middleware for parent and subdocs when middleware.post is false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: { post: false } });

        // Assert
        assert.strictEqual(getPreCount('save'), 1);
        assert.strictEqual(getPostCount('save'), 0);
        assert.strictEqual(getSubdocPreCount('save'), 1);
        assert.strictEqual(getSubdocPostCount('save'), 0);
      });
    });

    describe('validate hooks', function() {
      it('parent.save() still runs validate middleware when middleware: false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: false });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getPreCount('validate'), 1);
        assert.strictEqual(getPostCount('validate'), 1);
        assert.strictEqual(getSubdocPreCount('validate'), 1);
        assert.strictEqual(getSubdocPostCount('validate'), 1);
      });

      it('parent.save() still runs validate middleware when middleware.pre is false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: { pre: false } });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getPreCount('validate'), 1);
        assert.strictEqual(getPostCount('validate'), 1);
        assert.strictEqual(getSubdocPreCount('validate'), 1);
        assert.strictEqual(getSubdocPostCount('validate'), 1);
      });

      it('parent.save() still runs validate middleware when middleware.post is false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: { post: false } });

        // Assert - validation runs regardless of middleware option (use validateBeforeSave: false to skip)
        assert.strictEqual(getPreCount('validate'), 1);
        assert.strictEqual(getPostCount('validate'), 1);
        assert.strictEqual(getSubdocPreCount('validate'), 1);
        assert.strictEqual(getSubdocPostCount('validate'), 1);
      });

      it('parent.save() skips validate middleware when validateBeforeSave: false, even with middleware: false', async function() {
        // Arrange
        const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const doc = new User({ name: 'test', address: { city: 'NYC' } });

        // Act
        await doc.save({ middleware: false, validateBeforeSave: false });

        // Assert - validateBeforeSave: false skips validation entirely, so validate hooks don't run
        assert.strictEqual(getPreCount('validate'), 0);
        assert.strictEqual(getPostCount('validate'), 0);
        assert.strictEqual(getSubdocPreCount('validate'), 0);
        assert.strictEqual(getSubdocPostCount('validate'), 0);
      });
    });
  });

  describe('deleteOne hooks on removed subdocs', function() {
    it('parent.save() skips subdoc deleteOne pre hooks when middleware: false', async function() {
      // Arrange
      const { User, getSubdocPreCount } = createTestContext();
      const doc = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      doc.posts[0].deleteOne();

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
    });

    it('parent.save() skips subdoc deleteOne post hooks when middleware: false', async function() {
      // Arrange
      const { User, getSubdocPostCount } = createTestContext();
      const doc = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      doc.posts[0].deleteOne();

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
    });

    it('parent.save() skips only pre deleteOne hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const doc = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      doc.posts[0].deleteOne();

      // Act
      await doc.save({ middleware: { pre: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 1);
    });

    it('parent.save() skips only post deleteOne hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const doc = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      doc.posts[0].deleteOne();

      // Act
      await doc.save({ middleware: { post: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 1);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
    });
  });

  describe('Document instance operations', function() {
    it('doc.updateOne() skips middleware when middleware: false', async function() {
      // Arrange
      const { User, getDocPreCount, getDocPostCount } = createTestContext();
      const doc = await User.create({ name: 'test' });

      // Act
      await doc.updateOne({ bio: 'updated' }, { middleware: false });

      // Assert
      assert.strictEqual(getDocPreCount('updateOne'), 0);
      assert.strictEqual(getDocPostCount('updateOne'), 0);
      const found = await User.findById(doc._id);
      assert.strictEqual(found.bio, 'updated');
    });

    it('doc.deleteOne() skips middleware when middleware: false', async function() {
      // Arrange
      const { User, getDocPreCount, getDocPostCount } = createTestContext();
      const doc = await User.create({ name: 'test' });

      // Act
      await doc.deleteOne({ middleware: false });

      // Assert
      assert.strictEqual(getDocPreCount('deleteOne'), 0);
      assert.strictEqual(getDocPostCount('deleteOne'), 0);
    });

    it('doc.deleteOne() skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getDocPreCount, getDocPostCount } = createTestContext();
      const doc = await User.create({ name: 'test' });

      // Act
      await doc.deleteOne({ middleware: { pre: false } });

      // Assert
      assert.strictEqual(getDocPreCount('deleteOne'), 0);
      assert.strictEqual(getDocPostCount('deleteOne'), 1);
    });

    it('doc.deleteOne() skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getDocPreCount, getDocPostCount } = createTestContext();
      const doc = await User.create({ name: 'test' });

      // Act
      await doc.deleteOne({ middleware: { post: false } });

      // Assert
      assert.strictEqual(getDocPreCount('deleteOne'), 1);
      assert.strictEqual(getDocPostCount('deleteOne'), 0);
    });

    it('doc.deleteOne() skips subdoc deleteOne hooks when middleware: false', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const doc = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });

      // Act
      await doc.deleteOne({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
    });
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
        customPreHooks: [{ name: 'insertMany', fn: function() { throw preHookError; } }]
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
  });

  describe('Built-in middleware still runs when user middleware is skipped', function() {
    it('save() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const doc = new User({ name: 'test' });

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
    });

    it('findOneAndUpdate() updates timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const doc = await User.create({ name: 'test' });
      const originalUpdatedAt = doc.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const updated = await User.findOneAndUpdate(
        { _id: doc._id },
        { name: 'updated' },
        { new: true, middleware: false }
      );

      // Assert
      assert.strictEqual(getUserHookRan('findOneAndUpdate'), false);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('bulkSave() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const doc = new User({ name: 'test' });

      // Act
      await User.bulkSave([doc], { middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
    });

    it('bulkSave() skips post hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      const doc = new User({ name: 'test' });

      // Act
      await User.bulkSave([doc], { middleware: false });

      // Assert
      assert.strictEqual(getPreCount('save'), 0);
      assert.strictEqual(getPostCount('save'), 0);
    });

    it('bulkSave() skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      const doc = new User({ name: 'test' });

      // Act
      await User.bulkSave([doc], { middleware: { pre: false } });

      // Assert
      assert.strictEqual(getPreCount('save'), 0);
      assert.strictEqual(getPostCount('save'), 1);
    });

    it('bulkSave() skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      const doc = new User({ name: 'test' });

      // Act
      await User.bulkSave([doc], { middleware: { post: false } });

      // Assert
      assert.strictEqual(getPreCount('save'), 1);
      assert.strictEqual(getPostCount('save'), 0);
    });

    it('save() skips user hooks on subdocuments when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan, getChildHookRan } = createTestContext();
      const doc = new User({ name: 'test', address: { city: 'NYC' } });

      // Act
      await doc.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.strictEqual(getChildHookRan('save'), false);
    });

    it('save() runs validation when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const doc = new User({});

      // Act
      const err = await doc.save({ middleware: false }).then(() => null, err => err);

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
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
  });

  /**
   * Unified test context factory that creates a schema with all hooks registered.
   * Tests can check counters for any hook type without needing separate factory functions.
   */
  function createTestContext({
    uniqueIndex = false,
    customPreHooks = []
  } = {}) {
    // All hook names
    const allHooks = [
      'save', 'validate', 'find', 'findOne', 'findOneAndUpdate',
      'findOneAndDelete', 'findOneAndReplace', 'updateOne', 'updateMany',
      'deleteOne', 'deleteMany', 'countDocuments', 'replaceOne',
      'insertMany', 'bulkWrite', 'aggregate'
    ];

    // Hooks that have both query and document variants
    const dualHooks = ['deleteOne', 'updateOne'];

    // Counter structure: main.hookName.pre/post for query hooks
    // For deleteOne/updateOne, we use main.hookName for query, mainDoc.hookName for document
    const counts = { main: {}, mainDoc: {}, subdoc: {} };
    for (const hook of allHooks) {
      counts.main[hook] = { pre: 0, post: 0 };
      counts.subdoc[hook] = { pre: 0, post: 0 };
    }
    for (const hook of dualHooks) {
      counts.mainDoc[hook] = { pre: 0, post: 0 };
    }

    const addressSchema = new Schema({ city: String });
    const postSchema = new Schema({ title: String });

    for (const subdocSchema of [addressSchema, postSchema]) {
      for (const hook of ['save', 'validate', 'deleteOne']) {
        const opts = hook === 'deleteOne' ? { document: true, query: false } : undefined;
        subdocSchema.pre(hook, opts, function() { counts.subdoc[hook].pre++; });
        subdocSchema.post(hook, opts, function() { counts.subdoc[hook].post++; });
      }
    }

    const userSchema = new Schema({
      name: { type: String, required: true },
      bio: String,
      address: addressSchema,
      posts: [postSchema]
    }, { timestamps: true });

    // Register query/model hooks (these run for User.find(), User.updateOne(), etc.)
    for (const hook of allHooks) {
      userSchema.pre(hook, function() { counts.main[hook].pre++; });
      userSchema.post(hook, function() { counts.main[hook].post++; });
    }

    // Register document-specific hooks (these run for doc.deleteOne(), doc.updateOne())
    for (const hook of dualHooks) {
      userSchema.pre(hook, { document: true, query: false }, function() { counts.mainDoc[hook].pre++; });
      userSchema.post(hook, { document: true, query: false }, function() { counts.mainDoc[hook].post++; });
    }

    for (const { name, fn } of customPreHooks) {
      userSchema.pre(name, fn);
    }

    if (uniqueIndex) {
      userSchema.index({ name: 1 }, { unique: true });
    }

    const User = db.model('User', userSchema);

    const result = {
      User,
      counts,
      // Query/model hook counters
      getPreCount: (hook) => counts.main[hook]?.pre ?? 0,
      getPostCount: (hook) => counts.main[hook]?.post ?? 0,
      // Document hook counters (for doc.deleteOne, doc.updateOne)
      getDocPreCount: (hook) => counts.mainDoc[hook]?.pre ?? 0,
      getDocPostCount: (hook) => counts.mainDoc[hook]?.post ?? 0,
      // Subdoc counters
      getSubdocPreCount: (hook) => counts.subdoc[hook]?.pre ?? 0,
      getSubdocPostCount: (hook) => counts.subdoc[hook]?.post ?? 0,
      // Boolean helpers (check both query and doc hooks)
      getUserHookRan: (hook) => (counts.main[hook]?.pre > 0) || (counts.mainDoc[hook]?.pre > 0),
      getChildHookRan: (hook) => counts.subdoc[hook]?.pre > 0
    };

    if (uniqueIndex) {
      return User.init().then(() => result);
    }

    return result;
  }
});
