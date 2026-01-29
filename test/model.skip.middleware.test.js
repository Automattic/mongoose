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
      aggregate: (User, options) => User.aggregate([{ $match: {} }], options),
      distinct: (User, options) => User.distinct('name', {}, options),
      estimatedDocumentCount: (User, options) => User.estimatedDocumentCount(options),
      createCollection: (User, options) => User.createCollection(options)
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

    describe('bulkSave()', function() {
      it('skips pre/post hooks when middleware: false', async function() {
      // Arrange
        const { User, getPreCount, getPostCount } = createTestContext();
        const user = new User({ name: 'test' });

        // Act
        await User.bulkSave([user], { middleware: false });

        // Assert
        assert.strictEqual(getPreCount('save'), 0);
        assert.strictEqual(getPostCount('save'), 0);
      });

      it('skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
        const { User, getPreCount, getPostCount } = createTestContext();
        const user = new User({ name: 'test' });

        // Act
        await User.bulkSave([user], { middleware: { pre: false } });

        // Assert
        assert.strictEqual(getPreCount('save'), 0);
        assert.strictEqual(getPostCount('save'), 1);
      });

      it('skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
        const { User, getPreCount, getPostCount } = createTestContext();
        const user = new User({ name: 'test' });

        // Act
        await User.bulkSave([user], { middleware: { post: false } });

        // Assert
        assert.strictEqual(getPreCount('save'), 1);
        assert.strictEqual(getPostCount('save'), 0);
      });
    });
  });

  describe('aggregate().explain()', function() {
    it('skips pre/post hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();

      // Act
      await User.aggregate([{ $match: {} }]).option({ middleware: false }).explain();

      // Assert
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('runs hooks normally without middleware option', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();

      // Act
      await User.aggregate([{ $match: {} }]).explain();

      // Assert
      assert.strictEqual(getPreCount('aggregate'), 1);
      assert.strictEqual(getPostCount('aggregate'), 1);
    });

    it('skips only pre hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();

      // Act
      await User.aggregate([{ $match: {} }]).option({ middleware: { pre: false } }).explain();

      // Assert
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 1);
    });

    it('skips only post hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();

      // Act
      await User.aggregate([{ $match: {} }]).option({ middleware: { post: false } }).explain();

      // Assert
      assert.strictEqual(getPreCount('aggregate'), 1);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });
  });

  describe('init hooks via query options', function() {
    it('skips pre/post init hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'test' });

      // Act
      await User.findOne({}, null, { middleware: false });

      // Assert - find hooks should be skipped, but so should init hooks
      assert.strictEqual(getPreCount('find'), 0);
      assert.strictEqual(getPostCount('find'), 0);
      assert.strictEqual(getPreCount('init'), 0);
      assert.strictEqual(getPostCount('init'), 0);
    });

    it('runs init hooks normally without middleware option', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'test' });

      // Act
      await User.findOne({});

      // Assert
      assert.strictEqual(getPreCount('init'), 1);
      assert.strictEqual(getPostCount('init'), 1);
    });

    it('skips only pre init hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'test' });

      // Act
      await User.findOne({}, null, { middleware: { pre: false } });

      // Assert
      assert.strictEqual(getPreCount('init'), 0);
      assert.strictEqual(getPostCount('init'), 1);
    });

    it('skips only post init hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'test' });

      // Act
      await User.findOne({}, null, { middleware: { post: false } });

      // Assert
      assert.strictEqual(getPreCount('init'), 1);
      assert.strictEqual(getPostCount('init'), 0);
    });
  });

  describe('Subdocument operations', function() {
    describe('save hooks', function() {
      describe('subdocument.save()', function() {
        it('skips pre/post hooks when middleware: false', async function() {
          // Arrange
          const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.address.save({ suppressWarning: true, middleware: false });

          // Assert
          assert.strictEqual(getSubdocPreCount('save'), 0);
          assert.strictEqual(getSubdocPostCount('save'), 0);
        });

        it('runs hooks normally without middleware option', async function() {
          // Arrange
          const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.address.save({ suppressWarning: true });

          // Assert
          assert.strictEqual(getSubdocPreCount('save'), 1);
          assert.strictEqual(getSubdocPostCount('save'), 1);
        });

        it('skips only pre hooks when middleware: { pre: false }', async function() {
          // Arrange
          const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.address.save({ suppressWarning: true, middleware: { pre: false } });

          // Assert
          assert.strictEqual(getSubdocPreCount('save'), 0);
          assert.strictEqual(getSubdocPostCount('save'), 1);
        });

        it('skips only post hooks when middleware: { post: false }', async function() {
          // Arrange
          const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.address.save({ suppressWarning: true, middleware: { post: false } });

          // Assert
          assert.strictEqual(getSubdocPreCount('save'), 1);
          assert.strictEqual(getSubdocPostCount('save'), 0);
        });
      });

      describe('parent.save() with subdocs', function() {
        it('skips both parent and subdoc middleware when middleware: false', async function() {
          // Arrange
          const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.save({ middleware: false });

          // Assert
          assert.strictEqual(getPreCount('save'), 0);
          assert.strictEqual(getPostCount('save'), 0);
          assert.strictEqual(getSubdocPreCount('save'), 0);
          assert.strictEqual(getSubdocPostCount('save'), 0);
        });

        it('runs hooks normally without middleware option', async function() {
          // Arrange
          const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.save();

          // Assert
          assert.strictEqual(getPreCount('save'), 1);
          assert.strictEqual(getPostCount('save'), 1);
          assert.strictEqual(getSubdocPreCount('save'), 1);
          assert.strictEqual(getSubdocPostCount('save'), 1);
        });

        it('skips only pre middleware for parent and subdocs when middleware: { pre: false }', async function() {
          // Arrange
          const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.save({ middleware: { pre: false } });

          // Assert
          assert.strictEqual(getPreCount('save'), 0);
          assert.strictEqual(getPostCount('save'), 1);
          assert.strictEqual(getSubdocPreCount('save'), 0);
          assert.strictEqual(getSubdocPostCount('save'), 1);
        });

        it('skips only post middleware for parent and subdocs when middleware: { post: false }', async function() {
          // Arrange
          const { User, getPreCount, getPostCount, getSubdocPreCount, getSubdocPostCount } = createTestContext();
          const user = new User({ name: 'test', address: { city: 'NYC' } });

          // Act
          await user.save({ middleware: { post: false } });

          // Assert
          assert.strictEqual(getPreCount('save'), 1);
          assert.strictEqual(getPostCount('save'), 0);
          assert.strictEqual(getSubdocPreCount('save'), 1);
          assert.strictEqual(getSubdocPostCount('save'), 0);
        });
      });
    });
  });

  describe('deleteOne hooks on removed subdocs', function() {
    it('parent.save() skips subdoc deleteOne hooks when middleware: false', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      user.posts[0].deleteOne();

      // Act
      await user.save({ middleware: false });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
    });

    it('parent.save() skips only pre deleteOne hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      user.posts[0].deleteOne();

      // Act
      await user.save({ middleware: { pre: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 1);
    });

    it('parent.save() skips only post deleteOne hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
      const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });
      user.posts[0].deleteOne();

      // Act
      await user.save({ middleware: { post: false } });

      // Assert
      assert.strictEqual(getSubdocPreCount('deleteOne'), 1);
      assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
    });
  });

  describe('Document instance operations', function() {
    const operations = {
      updateOne: (user, options) => user.updateOne({ name: 'updated' }, options),
      deleteOne: (user, options) => user.deleteOne(options)
    };

    for (const [operation, runOperation] of Object.entries(operations)) {
      describe(`doc.${operation}()`, function() {
        it('skips pre/post hooks when middleware: false', async function() {
          // Arrange
          const { User, getDocPreCount, getDocPostCount } = createTestContext();
          const user = await User.create({ name: 'test' });

          // Act
          await runOperation(user, { middleware: false });

          // Assert
          assert.strictEqual(getDocPreCount(operation), 0);
          assert.strictEqual(getDocPostCount(operation), 0);
        });

        it('runs hooks normally without middleware option', async function() {
          // Arrange
          const { User, getDocPreCount, getDocPostCount } = createTestContext();
          const user = await User.create({ name: 'test' });

          // Act
          await runOperation(user);

          // Assert
          assert.strictEqual(getDocPreCount(operation), 1);
          assert.strictEqual(getDocPostCount(operation), 1);
        });

        it('skips only pre hooks when middleware: { pre: false }', async function() {
          // Arrange
          const { User, getDocPreCount, getDocPostCount } = createTestContext();
          const user = await User.create({ name: 'test' });

          // Act
          await runOperation(user, { middleware: { pre: false } });

          // Assert
          assert.strictEqual(getDocPreCount(operation), 0);
          assert.strictEqual(getDocPostCount(operation), 1);
        });

        it('skips only post hooks when middleware: { post: false }', async function() {
          // Arrange
          const { User, getDocPreCount, getDocPostCount } = createTestContext();
          const user = await User.create({ name: 'test' });

          // Act
          await runOperation(user, { middleware: { post: false } });

          // Assert
          assert.strictEqual(getDocPreCount(operation), 1);
          assert.strictEqual(getDocPostCount(operation), 0);
        });
      });
    }

    describe('doc.deleteOne() with subdocs', function() {
      it('skips subdoc deleteOne hooks when middleware: false', async function() {
        // Arrange
        const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });

        // Act
        await user.deleteOne({ middleware: false });

        // Assert
        assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
        assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
      });

      it('runs subdoc deleteOne hooks normally without middleware option', async function() {
        // Arrange
        const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });

        // Act
        await user.deleteOne();

        // Assert
        assert.strictEqual(getSubdocPreCount('deleteOne'), 1);
        assert.strictEqual(getSubdocPostCount('deleteOne'), 1);
      });

      it('skips only subdoc pre deleteOne hooks when middleware: { pre: false }', async function() {
        // Arrange
        const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });

        // Act
        await user.deleteOne({ middleware: { pre: false } });

        // Assert
        assert.strictEqual(getSubdocPreCount('deleteOne'), 0);
        assert.strictEqual(getSubdocPostCount('deleteOne'), 1);
      });

      it('skips only subdoc post deleteOne hooks when middleware: { post: false }', async function() {
        // Arrange
        const { User, getSubdocPreCount, getSubdocPostCount } = createTestContext();
        const user = await User.create({ name: 'parent', posts: [{ title: 'First post' }] });

        // Act
        await user.deleteOne({ middleware: { post: false } });

        // Assert
        assert.strictEqual(getSubdocPreCount('deleteOne'), 1);
        assert.strictEqual(getSubdocPostCount('deleteOne'), 0);
      });
    });
  });


  describe('Built-in middleware still runs when user middleware is skipped', function() {
    it('save() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const user = new User({ name: 'test' });

      // Act
      await user.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.ok(user.createdAt);
      assert.ok(user.updatedAt);
    });

    it('findOneAndUpdate() updates timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const user = await User.create({ name: 'test' });
      const originalUpdatedAt = user.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { name: 'updated' },
        { returnDocument: 'after', middleware: false }
      );

      // Assert
      assert.strictEqual(getUserHookRan('findOneAndUpdate'), false);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('bulkSave() sets timestamps when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const user = new User({ name: 'test' });

      // Act
      await User.bulkSave([user], { middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.ok(user.createdAt);
      assert.ok(user.updatedAt);
    });

    it('save() skips user hooks on subdocuments when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan, getChildHookRan } = createTestContext();
      const user = new User({ name: 'test', address: { city: 'NYC' } });

      // Act
      await user.save({ middleware: false });

      // Assert
      assert.strictEqual(getUserHookRan('save'), false);
      assert.strictEqual(getChildHookRan('save'), false);
    });

    it('save() still triggers subdoc save hooks mechanism when middleware: false', async function() {
      // Arrange
      const { User, getChildHookRan } = createTestContext();
      const user = new User({ name: 'test', address: { city: 'NYC' } });

      // Act
      await user.save({ middleware: false });

      // Assert - subdoc timestamps should be set (proves saveSubdocs built-in hook ran)
      assert.strictEqual(getChildHookRan('save'), false);
      assert.ok(user.address.createdAt, 'Subdoc createdAt should be set');
      assert.ok(user.address.updatedAt, 'Subdoc updatedAt should be set');
    });

    it('save() runs validation when middleware: false', async function() {
      // Arrange
      const { User, getUserHookRan } = createTestContext();
      const user = new User({});

      // Act
      const err = await user.save({ middleware: false }).then(() => null, err => err);

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
      const builtInHooks = allHooks.filter(hook => hook.fn[builtInMiddleware]);

      assert.ok(builtInHooks.length >= 18, 'Expected at least 18 built-in hooks'); // 18 is current count, may increase in future
      assert.deepStrictEqual(
        allHooks,
        builtInHooks,
        'All internal plugin hooks should have builtInMiddleware symbol'
      );
    });
  });

  /**
   * Unified test context factory that creates a schema with all hooks registered.
   * Tests can check counters for any hook type without needing separate factory functions.
   */
  function createTestContext() {
    const hookNames = [
      'save', 'validate', 'find', 'findOne', 'findOneAndUpdate',
      'findOneAndDelete', 'findOneAndReplace', 'updateOne', 'updateMany',
      'deleteOne', 'deleteMany', 'countDocuments', 'replaceOne',
      'insertMany', 'bulkWrite', 'aggregate', 'distinct', 'estimatedDocumentCount',
      'createCollection', 'init'
    ];
    const documentHookNames = ['deleteOne', 'updateOne'];
    const subdocHookNames = ['save', 'validate', 'deleteOne'];

    const counts = { query: {}, document: {}, subdoc: {} };
    for (const hook of hookNames) {
      counts.query[hook] = { pre: 0, post: 0 };
      counts.subdoc[hook] = { pre: 0, post: 0 };
    }
    for (const hook of documentHookNames) {
      counts.document[hook] = { pre: 0, post: 0 };
    }

    const addressSchema = new Schema({ city: String }, { timestamps: true });
    const postSchema = new Schema({ title: String }, { timestamps: true });
    const userSchema = new Schema({
      name: { type: String, required: true },
      bio: String,
      address: addressSchema,
      posts: [postSchema]
    }, { timestamps: true, autoCreate: false });


    for (const subdocSchema of [addressSchema, postSchema]) {
      for (const hook of subdocHookNames) {
        const opts = hook === 'deleteOne' ? { document: true, query: false } : undefined;
        subdocSchema.pre(hook, opts, function() { counts.subdoc[hook].pre++; });
        subdocSchema.post(hook, opts, function() { counts.subdoc[hook].post++; });
      }
    }

    // Query/model hooks: User.find(), User.updateOne(), etc.
    for (const hook of hookNames) {
      userSchema.pre(hook, function() { counts.query[hook].pre++; });
      userSchema.post(hook, function() { counts.query[hook].post++; });
    }

    // Document hooks: user.deleteOne(), user.updateOne()
    for (const hook of documentHookNames) {
      userSchema.pre(hook, { document: true, query: false }, function() { counts.document[hook].pre++; });
      userSchema.post(hook, { document: true, query: false }, function() { counts.document[hook].post++; });
    }

    const User = db.model('User', userSchema);

    return {
      User,
      counts,
      // Query/model hook counters: User.find(), User.deleteOne()
      getPreCount: (hook) => counts.query[hook]?.pre ?? 0,
      getPostCount: (hook) => counts.query[hook]?.post ?? 0,
      // Document hook counters: user.deleteOne(), user.updateOne()
      getDocPreCount: (hook) => counts.document[hook]?.pre ?? 0,
      getDocPostCount: (hook) => counts.document[hook]?.post ?? 0,
      // Subdoc counters
      getSubdocPreCount: (hook) => counts.subdoc[hook]?.pre ?? 0,
      getSubdocPostCount: (hook) => counts.subdoc[hook]?.post ?? 0,
      // Boolean helpers
      getUserHookRan: (hook) => (counts.query[hook]?.pre > 0) || (counts.query[hook]?.post > 0) || (counts.document[hook]?.pre > 0) || (counts.document[hook]?.post > 0),
      getChildHookRan: (hook) => (counts.subdoc[hook]?.pre > 0) || (counts.subdoc[hook]?.post > 0)
    };
  }
});
