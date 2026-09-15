'use strict';

/**
 * Test dependencies.
 */
const { builtInMiddleware } = require('../lib/schema/symbols');

const start = require('./common');

const assert = require('assert');
const sinon = require('sinon');

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

  describe('validation middleware in write operations', function() {
    const operations = {
      save: (User, ages, options) => new User({ age: ages[0] }).save(options),
      'insertMany with plain objects': (User, ages, options) => User.insertMany(ages.map(age => ({ age })), options),
      'insertMany with documents': (User, ages, options) => User.insertMany(ages.map(age => new User({ age })), options)
    };

    for (const [operation, runOperation] of Object.entries(operations)) {
      describe(operation, function() {
        const documentCount = operation === 'save' ? 1 : 2;

        it('skips validation hooks with middleware: false', async function() {
          // Arrange
          const { User, calls } = createTestContext();

          // Act
          await runOperation(User, [20, 30], { middleware: false });

          // Assert
          assert.deepStrictEqual(calls, { pre: 0, post: 0, validators: documentCount });
          assert.strictEqual(await User.collection.countDocuments(), documentCount);
        });

        it('runs validation hooks without a middleware option', async function() {
          // Arrange
          const { User, calls } = createTestContext();

          // Act
          await runOperation(User, [20, 30]);

          // Assert
          assert.deepStrictEqual(calls, { pre: documentCount, post: documentCount, validators: documentCount });
          assert.strictEqual(await User.collection.countDocuments(), documentCount);
        });

        it('skips only pre-validation hooks with middleware: { pre: false }', async function() {
          // Arrange
          const { User, calls } = createTestContext();

          // Act
          await runOperation(User, [20, 30], { middleware: { pre: false } });

          // Assert
          assert.deepStrictEqual(calls, { pre: 0, post: documentCount, validators: documentCount });
          assert.strictEqual(await User.collection.countDocuments(), documentCount);
        });

        it('skips only post-validation hooks with middleware: { post: false }', async function() {
          // Arrange
          const { User, calls } = createTestContext();

          // Act
          await runOperation(User, [20, 30], { middleware: { post: false } });

          // Assert
          assert.deepStrictEqual(calls, { pre: documentCount, post: 0, validators: documentCount });
          assert.strictEqual(await User.collection.countDocuments(), documentCount);
        });

        it('rejects invalid documents without writing when middleware: false', async function() {
          // Arrange
          const { User, calls } = createTestContext();

          // Act
          const error = await runOperation(User, [-1, -2], { middleware: false }).then(() => null, err => err);

          // Assert
          assert.ok(error instanceof mongoose.Error.ValidationError);
          assert.ok(error.errors.age);
          assert.strictEqual(await User.collection.countDocuments(), 0);
          assert.deepStrictEqual(calls, { pre: 0, post: 0, validators: documentCount });
        });
      });
    }

    function createTestContext() {
      const calls = { pre: 0, post: 0, validators: 0 };
      const userSchema = new Schema({
        age: {
          type: Number,
          required: true,
          validate(value) {
            calls.validators++;
            return value >= 0;
          }
        }
      });
      userSchema.pre('validate', function() { calls.pre++; });
      userSchema.post('validate', function() { calls.post++; });
      const User = db.model('User', userSchema);
      return { User, calls };
    }
  });

  describe('subdocument validation middleware', function() {
    const operations = {
      validate: (User, data, options) => new User(data).validate(options),
      save: (User, data, options) => new User(data).save(options),
      'insertMany with plain objects': (User, data, options) => User.insertMany([data], options),
      'insertMany with documents': (User, data, options) => User.insertMany([new User(data)], options)
    };
    const selections = [
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'no middleware option', options: undefined, pre: 6, post: 6 },
      { name: 'middleware: { pre: false }', options: { middleware: { pre: false } }, pre: 0, post: 6 },
      { name: 'middleware: { post: false }', options: { middleware: { post: false } }, pre: 6, post: 0 }
    ];

    for (const [operation, runOperation] of Object.entries(operations)) {
      describe(operation, function() {
        for (const selection of selections) {
          it(`respects ${selection.name} at each nesting level`, async function() {
            // Arrange
            const { User, data, calls } = createTestContext();

            // Act
            await runOperation(User, data, selection.options);

            // Assert
            assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post, errors: 0, validators: 4 });
            assert.strictEqual(await User.collection.countDocuments(), operation === 'validate' ? 0 : 1);
          });
        }

        it('rejects invalid subdocuments without hooks or writes when middleware: false', async function() {
          // Arrange
          const { User, data, calls } = createTestContext();
          data.single.single.age = -1;
          data.children[0].children[0].age = -2;

          // Act
          const error = await runOperation(User, data, { middleware: false }).then(() => null, err => err);

          // Assert
          assert.ok(error instanceof mongoose.Error.ValidationError);
          assert.ok(error.errors['single.single.age']);
          assert.ok(error.errors['children.0.children.0.age']);
          assert.strictEqual(await User.collection.countDocuments(), 0);
          assert.deepStrictEqual(calls, { pre: 0, post: 0, errors: 0, validators: 4 });
        });

        for (const phase of ['pre', 'post']) {
          it(`respects middleware: { ${phase}: false } for validation errors`, async function() {
            // Arrange
            const { User, data, calls } = createTestContext();
            data.single.single.age = -1;

            // Act
            const error = await runOperation(User, data, { middleware: { [phase]: false } }).then(() => null, err => err);

            // Assert
            assert.ok(error instanceof mongoose.Error.ValidationError);
            assert.ok(error.errors['single.single.age']);
            assert.strictEqual(await User.collection.countDocuments(), 0);
            assert.strictEqual(calls.validators, 4);
            assert.strictEqual(calls.pre, phase === 'pre' ? 0 : 6);
            assert.strictEqual(calls.post, phase === 'post' ? 0 : 4);
            assert.strictEqual(calls.errors, phase === 'post' ? 0 : 2);
          });
        }
      });
    }

    for (const operation of ['validate', 'save']) {
      it(`skips hooks during ${operation} after editing existing subdocuments`, async function() {
        // Arrange
        const { User, data, calls } = createTestContext();
        const stored = new User(data).toObject();
        await User.collection.insertOne(stored);
        const user = User.hydrate(stored);
        user.single.single.age = 25;
        user.children[0].children[0].age = 35;

        // Act
        await user[operation]({ middleware: false });

        // Assert
        assert.strictEqual(calls.pre, 0);
        assert.strictEqual(calls.post, 0);
        assert.strictEqual(calls.errors, 0);
        assert.ok(calls.validators > 0);
        const persisted = await User.collection.findOne({ _id: user._id });
        assert.strictEqual(persisted.single.single.age, operation === 'save' ? 25 : 20);
        assert.strictEqual(persisted.children[0].children[0].age, operation === 'save' ? 35 : 30);
      });
    }

    function createTestContext() {
      const calls = { pre: 0, post: 0, errors: 0, validators: 0 };
      const childSchema = new Schema({
        age: {
          type: Number,
          validate(value) {
            calls.validators++;
            return value >= 0;
          }
        }
      });
      const parentSchema = new Schema({ single: childSchema, children: [childSchema] });
      for (const schema of [parentSchema, childSchema]) {
        schema.pre('validate', function() { calls.pre++; });
        schema.post('validate', function() { calls.post++; });
        schema.post('validate', function(error, doc, next) {
          calls.errors++;
          next(error);
        });
      }
      const User = db.model('User', new Schema({ single: parentSchema, children: [parentSchema] }));
      const data = {
        single: { single: { age: 20 }, children: [{ age: 30 }] },
        children: [{ single: { age: 20 }, children: [{ age: 30 }] }]
      };
      return { User, data, calls };
    }
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

      // Assert
      assert.strictEqual(getPreCount('findOne'), 0);
      assert.strictEqual(getPostCount('findOne'), 0);
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
      assert.strictEqual(getPreCount('findOne'), 1);
      assert.strictEqual(getPostCount('findOne'), 1);
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
      assert.strictEqual(getPreCount('findOne'), 0);
      assert.strictEqual(getPostCount('findOne'), 1);
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
      assert.strictEqual(getPreCount('findOne'), 1);
      assert.strictEqual(getPostCount('findOne'), 0);
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

      assert.ok(builtInHooks.length >= 17, 'Expected at least 17 built-in hooks'); // 17 is current count, may increase in future
      assert.deepStrictEqual(
        allHooks,
        builtInHooks,
        'All internal plugin hooks should have builtInMiddleware symbol'
      );
    });
  });

  describe('middleware option parsing', function() {
    it('runs hooks for falsy middleware option values other than false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });

      // Act
      await User.find({}, null, { middleware: 0 }).exec();
      await User.find({}, null, { middleware: { pre: 0, post: '' } }).exec();

      // Assert
      assert.strictEqual(getPreCount('find'), 2);
      assert.strictEqual(getPostCount('find'), 2);
    });
  });

  describe('query cursor', function() {
    it('skips pre/post find hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.find().cursor({ middleware: false }).eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('find'), 0);
      assert.strictEqual(getPostCount('find'), 0);
    });

    it('runs find hooks normally without middleware option', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.find().cursor().eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('find'), 1);
      assert.strictEqual(getPostCount('find'), 1);
    });

    it('skips only pre find hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.find().cursor({ middleware: { pre: false } }).eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('find'), 0);
      assert.strictEqual(getPostCount('find'), 1);
    });

    it('skips only post find hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.find().cursor({ middleware: { post: false } }).eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('find'), 1);
      assert.strictEqual(getPostCount('find'), 0);
    });

    it('skips pre/post find hooks when iterating with next() when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });

      // Act
      const cursor = User.find().cursor({ middleware: false });
      const doc = await cursor.next();

      // Assert
      assert.ok(doc);
      assert.strictEqual(doc.name, 'John');
      assert.strictEqual(getPreCount('find'), 0);
      assert.strictEqual(getPostCount('find'), 0);
    });

    it('does not leak the middleware option into collection.find', async function() {
      // Arrange
      const { User } = createTestContext();
      await User.create({ name: 'John' });
      const findSpy = sinon.spy(User.collection, 'find');

      // Act
      try {
        await User.find().cursor({ middleware: false }).eachAsync(() => {});
      } finally {
        findSpy.restore();
      }

      // Assert
      assert.ok(findSpy.called);
      assert.strictEqual(findSpy.firstCall.args[1].middleware, undefined);
    });
  });

  describe('aggregate cursor', function() {
    // Aggregate cursors only execute pre aggregate hooks. Post aggregate hooks are
    // result-level hooks for aggregate.exec()/explain(), not cursor iteration.
    it('skips pre aggregate hooks when middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.aggregate([{ $match: {} }]).option({ middleware: false }).cursor().eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('skips pre aggregate hooks when cursor options have middleware: false', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.aggregate([{ $match: {} }]).cursor({ middleware: false }).eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('runs pre aggregate hooks without running post aggregate hooks', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.aggregate([{ $match: {} }]).cursor().eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('aggregate'), 1);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('skips pre aggregate hooks when middleware: { pre: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.aggregate([{ $match: {} }]).cursor({ middleware: { pre: false } }).eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('runs pre aggregate hooks when middleware: { post: false }', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      let numDocs = 0;

      // Act
      await User.aggregate([{ $match: {} }]).option({ middleware: { post: false } }).cursor().eachAsync(doc => {
        ++numDocs;
        assert.strictEqual(doc.name, 'John');
      });

      // Assert
      assert.strictEqual(numDocs, 1);
      assert.strictEqual(getPreCount('aggregate'), 1);
      assert.strictEqual(getPostCount('aggregate'), 0);
    });

    it('does not leak the middleware option into collection.aggregate', async function() {
      // Arrange
      const { User } = createTestContext();
      await User.create({ name: 'John' });
      const aggregateSpy = sinon.spy(User.collection, 'aggregate');

      // Act
      try {
        await User.aggregate([{ $match: {} }]).option({ middleware: false }).cursor().eachAsync(() => {});
        await User.aggregate([{ $match: {} }]).cursor({ middleware: false }).eachAsync(() => {});
      } finally {
        aggregateSpy.restore();
      }

      // Assert
      assert.strictEqual(aggregateSpy.callCount, 2);
      assert.strictEqual(aggregateSpy.firstCall.args[1].middleware, undefined);
      assert.strictEqual(aggregateSpy.secondCall.args[1].middleware, undefined);
      assert.strictEqual(aggregateSpy.secondCall.args[1].cursor.middleware, undefined);
    });

    it('preserves the middleware option on the aggregate after running a cursor', async function() {
      // Arrange
      const { User, getPreCount, getPostCount } = createTestContext();
      await User.create({ name: 'John' });
      const aggregate = User.aggregate([{ $match: {} }]).option({ middleware: false });

      // Act
      await aggregate.cursor().eachAsync(() => {});

      // Assert: option survived (sanitized clone sent to driver, agg.options not mutated)
      assert.strictEqual(getPreCount('aggregate'), 0);
      assert.strictEqual(getPostCount('aggregate'), 0);
      assert.strictEqual(aggregate.options.middleware, false);
    });
  });

  describe('custom statics and methods', function() {
    describe('statics', function() {
      it('skips pre/post hooks on a custom static when middleware: false', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext({ supportsMiddlewareOption: true });
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John', { middleware: false });

        // Assert
        assert.ok(user);
        assert.strictEqual(user.name, 'John');
        assert.strictEqual(getStaticPreCount(), 0);
        assert.strictEqual(getStaticPostCount(), 0);
      });

      it('ignores the middleware option when the static does not set supportsMiddlewareOption', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext();
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John', { middleware: false });

        // Assert
        assert.ok(user);
        assert.strictEqual(user.name, 'John');
        assert.strictEqual(getStaticPreCount(), 1);
        assert.strictEqual(getStaticPostCount(), 1);
      });

      it('runs custom static hooks normally without middleware option', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext({ supportsMiddlewareOption: true });
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John');

        // Assert
        assert.ok(user);
        assert.strictEqual(user.name, 'John');
        assert.strictEqual(getStaticPreCount(), 1);
        assert.strictEqual(getStaticPostCount(), 1);
      });

      it('runs static hooks for falsy middleware option values other than false', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext({ supportsMiddlewareOption: true });
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John', { middleware: 0 });

        // Assert
        assert.ok(user);
        assert.strictEqual(getStaticPreCount(), 1);
        assert.strictEqual(getStaticPostCount(), 1);
      });

      it('skips only pre hooks when middleware: { pre: false }', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext({ supportsMiddlewareOption: true });
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John', { middleware: { pre: false } });

        // Assert
        assert.ok(user);
        assert.strictEqual(user.name, 'John');
        assert.strictEqual(getStaticPreCount(), 0);
        assert.strictEqual(getStaticPostCount(), 1);
      });

      it('skips only post hooks when middleware: { post: false }', async function() {
        // Arrange
        const { User, getStaticPreCount, getStaticPostCount } = createStaticsContext({ supportsMiddlewareOption: true });
        await User.create({ name: 'John' });

        // Act
        const user = await User.findByName('John', { middleware: { post: false } });

        // Assert
        assert.ok(user);
        assert.strictEqual(user.name, 'John');
        assert.strictEqual(getStaticPreCount(), 1);
        assert.strictEqual(getStaticPostCount(), 0);
      });

      function createStaticsContext({ supportsMiddlewareOption = false } = {}) {
        let preCount = 0;
        let postCount = 0;
        const userSchema = new Schema({ name: String });
        userSchema.statics.findByName = function(name, options = {}) {
          assert.ok(options);
          return this.findOne({ name });
        };
        if (supportsMiddlewareOption) {
          userSchema.statics.findByName.supportsMiddlewareOption = true;
        }
        userSchema.pre('findByName', function() { preCount++; });
        userSchema.post('findByName', function() { postCount++; });
        const User = db.model('User', userSchema);
        return { User, getStaticPreCount: () => preCount, getStaticPostCount: () => postCount };
      }
    });

    describe('methods', function() {
      it('skips pre/post hooks on a custom method when middleware: false', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext({ supportsMiddlewareOption: true });
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate({ middleware: false });

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(user.active, true);
        assert.strictEqual(getMethodPreCount(), 0);
        assert.strictEqual(getMethodPostCount(), 0);
      });

      it('ignores the middleware option when the method does not set supportsMiddlewareOption', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext();
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate({ middleware: false });

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(user.active, true);
        assert.strictEqual(getMethodPreCount(), 1);
        assert.strictEqual(getMethodPostCount(), 1);
      });

      it('runs custom method hooks normally without middleware option', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext({ supportsMiddlewareOption: true });
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate();

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(user.active, true);
        assert.strictEqual(getMethodPreCount(), 1);
        assert.strictEqual(getMethodPostCount(), 1);
      });

      it('runs method hooks for falsy middleware option values other than false', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext({ supportsMiddlewareOption: true });
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate({ middleware: 0 });

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(getMethodPreCount(), 1);
        assert.strictEqual(getMethodPostCount(), 1);
      });

      it('skips only pre hooks when middleware: { pre: false }', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext({ supportsMiddlewareOption: true });
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate({ middleware: { pre: false } });

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(user.active, true);
        assert.strictEqual(getMethodPreCount(), 0);
        assert.strictEqual(getMethodPostCount(), 1);
      });

      it('skips only post hooks when middleware: { post: false }', async function() {
        // Arrange
        const { User, getMethodPreCount, getMethodPostCount } = createMethodsContext({ supportsMiddlewareOption: true });
        const user = await User.create({ name: 'John' });

        // Act
        const result = await user.activate({ middleware: { post: false } });

        // Assert
        assert.strictEqual(result, user);
        assert.strictEqual(user.active, true);
        assert.strictEqual(getMethodPreCount(), 1);
        assert.strictEqual(getMethodPostCount(), 0);
      });

      function createMethodsContext({ supportsMiddlewareOption = false } = {}) {
        let preCount = 0;
        let postCount = 0;
        const userSchema = new Schema({ name: String, active: Boolean });
        userSchema.methods.activate = function(options = {}) {
          assert.ok(options);
          this.active = true;
          return this;
        };
        if (supportsMiddlewareOption) {
          userSchema.methods.activate.supportsMiddlewareOption = true;
        }
        userSchema.pre('activate', function() { preCount++; });
        userSchema.post('activate', function() { postCount++; });
        const User = db.model('User', userSchema);
        return { User, getMethodPreCount: () => preCount, getMethodPostCount: () => postCount };
      }
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
