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

  describe('query instance middleware', function() {
    const selections = [
      { name: 'no middleware option', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'middleware: { pre: false }', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'middleware: { post: false }', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const selection of selections) {
      for (const execution of ['exec', 'then']) {
        it(`respects ${selection.name} with ${execution}()`, async function() {
          // Arrange
          const { User, calls, addInstanceHooks } = await createTestContext();
          const query = addInstanceHooks(User.find({ name: 'John' }).setOptions(selection.options));

          // Act
          const users = await (execution === 'exec' ? query.exec() : query.then(users => users));

          // Assert
          assert.deepStrictEqual(users.map(user => user.name), ['John']);
          assert.deepStrictEqual(calls.instance, { pre: selection.pre, post: selection.post });
          assert.deepStrictEqual(calls.query, { pre: selection.pre, post: selection.post });

          const ordinary = addInstanceHooks(User.find({ name: 'Jane' }));
          const laterUsers = await ordinary;
          assert.deepStrictEqual(laterUsers.map(user => user.name), ['Jane']);
          assert.deepStrictEqual(calls.instance, { pre: selection.pre + 1, post: selection.post + 1 });
          assert.deepStrictEqual(calls.query, { pre: selection.pre + 1, post: selection.post + 1 });
        });
      }

      for (const operation of ['updateOne', 'deleteOne']) {
        it(`preserves document ${operation} internals with ${selection.name}`, async function() {
          // Arrange
          const { User, user, calls, addInstanceHooks } = await createTestContext();
          const query = operation === 'updateOne' ?
            user.updateOne({ name: 'John updated' }, selection.options) :
            user.deleteOne(selection.options);
          addInstanceHooks(query);

          // Act
          const result = await query;

          // Assert
          assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
          assert.deepStrictEqual(query.getFilter(), { _id: user._id, tenantId: 'north' });
          assert.deepStrictEqual(calls.instance, { pre: selection.pre, post: selection.post });
          assert.deepStrictEqual(calls.query, { pre: selection.pre, post: selection.post });
          assert.deepStrictEqual(calls.document, { pre: selection.pre, post: selection.post });
          assert.deepStrictEqual(calls.internalDocument, { pre: 1, post: 1 });
          assert.deepStrictEqual(calls.subdocument, operation === 'deleteOne' ?
            { pre: selection.pre, post: selection.post } : { pre: 0, post: 0 });
          assert.deepStrictEqual(calls.internalSubdocument, operation === 'deleteOne' ?
            { pre: 1, post: 1 } : { pre: 0, post: 0 });
          const stored = await User.collection.findOne({ _id: user._id });
          if (operation === 'updateOne') {
            assert.strictEqual(stored.name, 'John updated');
          } else {
            assert.strictEqual(stored, null);
            assert.strictEqual(user.$isDeleted(), true);
          }
          assert.strictEqual(await User.collection.countDocuments({ name: 'Jane' }), 1);
        });
      }
    }

    for (const operation of ['updateOne', 'deleteOne']) {
      it(`preserves the document session during ${operation} with middleware: false`, async function() {
        // Arrange
        const { user } = await createTestContext();
        const session = await db.startSession();
        user.$session(session);
        const query = operation === 'updateOne' ?
          user.updateOne({ name: 'John updated' }, { middleware: false }) :
          user.deleteOne({ middleware: false });

        try {
          // Act
          const result = await query;

          // Assert
          assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
          assert.strictEqual(query.getOptions().session, session);
        } finally {
          await session.endSession();
        }
      });
    }

    it('preserves the already-deleted guard with middleware: false', async function() {
      // Arrange
      const { User, user } = await createTestContext();
      user.$isDeleted(true);

      // Act
      await user.deleteOne({ middleware: false });

      // Assert
      assert.strictEqual(await User.collection.countDocuments({ _id: user._id }), 1);
    });

    async function createTestContext() {
      const calls = {
        instance: { pre: 0, post: 0 },
        query: { pre: 0, post: 0 },
        document: { pre: 0, post: 0 },
        subdocument: { pre: 0, post: 0 },
        internalDocument: { pre: 0, post: 0 },
        internalSubdocument: { pre: 0, post: 0 }
      };
      const addressSchema = new Schema({ city: String });
      const userSchema = new Schema({
        name: String,
        tenantId: String,
        address: addressSchema
      }, { shardKey: { tenantId: 1 } });
      for (const operation of ['find', 'updateOne', 'deleteOne']) {
        userSchema.pre(operation, { query: true, document: false }, function() { calls.query.pre++; });
        userSchema.post(operation, { query: true, document: false }, function() { calls.query.post++; });
      }
      for (const operation of ['updateOne', 'deleteOne']) {
        userSchema.pre(operation, { document: true, query: false }, function() { calls.document.pre++; });
        userSchema.post(operation, { document: true, query: false }, function() { calls.document.post++; });
        addInternalHooks(userSchema, operation, calls.internalDocument);
      }
      addressSchema.pre('deleteOne', { document: true, query: false }, function() { calls.subdocument.pre++; });
      addressSchema.post('deleteOne', { document: true, query: false }, function() { calls.subdocument.post++; });
      addInternalHooks(addressSchema, 'deleteOne', calls.internalSubdocument);
      const User = db.model('User', userSchema);
      const data = new User({ name: 'John', tenantId: 'north', address: { city: 'Amsterdam' } }).toObject();
      await User.collection.insertMany([data, { name: 'Jane', tenantId: 'south' }]);
      const user = User.hydrate(data);
      return { User, user, calls, addInstanceHooks };

      function addInstanceHooks(query) {
        query.pre(function() { calls.instance.pre++; });
        query.post(function() { calls.instance.post++; });
        return query;
      }

      function addInternalHooks(schema, operation, counts) {
        function pre() { counts.pre++; }
        function post() { counts.post++; }
        pre[builtInMiddleware] = true;
        post[builtInMiddleware] = true;
        schema.pre(operation, { document: true, query: false }, pre);
        schema.post(operation, { document: true, query: false }, post);
      }
    }
  });

  describe('bulk validation and middleware', function() {
    // Age must be 0 or greater, including asynchronous validation.
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const operation of ['bulkSave', 'insertOne', 'replaceOne']) {
      for (const selection of selections) {
        it(`${operation} respects ${selection.name} during validation and save hooks`, async function() {
          // Arrange
          const { User, calls, data } = createTestContext();
          const doc = new User(data);

          // Act
          await runOperation(User, operation, doc, selection.options);

          // Assert
          assertSelectedHooks(calls, selection, operation);
          const stored = await User.collection.findOne({ name: 'Alice' });
          assert.strictEqual(stored.age, 20);
          assert.strictEqual(stored.profile.age, 20);
          assert.strictEqual(stored.children[0].age, 20);
          assert.ok(stored.createdAt instanceof Date);
          if (operation === 'bulkSave') {
            assert.strictEqual(doc.isNew, false);
            assert.strictEqual(doc.isModified(), false);
          }

          resetCalls(calls);
          const normalDoc = await User.findById(stored._id);
          normalDoc.age = 21;
          await User.bulkSave([normalDoc]);
          assertSelectedHooks(calls, { pre: 1, post: 1 }, 'bulkSave');
        });

        it(`${operation} rejects an async validator with ${selection.name} before writing`, async function() {
          // Arrange
          const { User, data } = createTestContext();
          const doc = new User({ ...data, age: -1 });
          if (operation === 'replaceOne') {
            await User.collection.insertOne(data);
          }

          // Act
          const error = await runOperation(User, operation, doc, selection.options).then(() => null, err => err);

          // Assert
          assert.ok(error instanceof mongoose.Error.ValidationError);
          assert.strictEqual(error.errors.age.kind, 'user defined');
          const stored = await User.collection.findOne({ name: 'Alice' });
          assert.strictEqual(stored?.age, operation === 'replaceOne' ? 20 : undefined);
        });
      }
    }

    it('bulkSave validates every document before sending any writes', async function() {
      // Arrange
      const { User, data } = createTestContext();
      const docs = [new User(data), new User({ ...data, name: 'Bob', age: -1 })];

      // Act
      const error = await User.bulkSave(docs, { middleware: false }).then(() => null, err => err);

      // Assert
      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(await User.countDocuments(), 0);
      assert.ok(docs.every(doc => doc.isNew));
    });

    it('bulkSave uses current children and middleware selection on repeated saves', async function() {
      // Arrange
      const { User, data, calls } = createTestContext();
      const doc = new User(data);
      await User.bulkSave([doc], { middleware: false });
      doc.children.push({ age: 21 });
      resetCalls(calls);

      // Act
      await User.bulkSave([doc], { validateBeforeSave: false });

      // Assert
      assert.strictEqual(calls.savePre, 1);
      assert.strictEqual(calls.savePost, 1);
      assert.strictEqual(calls.childSavePre, 3);
      assert.strictEqual(calls.childSavePost, 3);
      assert.strictEqual((await User.collection.findOne({ _id: doc._id })).children.length, 2);
    });

    it('bulkSave awaits validation before user save hooks', async function() {
      // Arrange
      const { User, data, events } = createTestContext();

      // Act
      await User.bulkSave([new User(data)]);

      // Assert
      assert.ok(events.indexOf('parent:validated') !== -1);
      assert.ok(events.indexOf('parent:validated') < events.indexOf('parent:save'));
      assert.ok(events.indexOf('child:validated') < events.indexOf('child:save'));
    });

    for (const options of [{ validateBeforeSave: false }, { skipValidation: true }]) {
      it(`bulkSave preserves ${Object.keys(options)[0]} when validation is disabled`, async function() {
        // Arrange
        const { User, data, calls } = createTestContext();
        const doc = new User({ ...data, name: undefined, age: -1 });

        // Act
        await User.bulkSave([doc], options);

        // Assert
        assert.strictEqual((await User.collection.findOne({ _id: doc._id })).age, -1);
        assert.strictEqual(calls.validatePre, 0);
        assert.strictEqual(calls.validatePost, 0);
        assert.strictEqual(calls.savePre, 1);
        assert.strictEqual(calls.childSavePre, 2);
      });
    }

    it('bulkSave respects schema validation defaults and an explicit override', async function() {
      // Arrange
      const { User, data } = createTestContext({ validateBeforeSave: false });
      const skipped = new User({ ...data, name: undefined, age: -1 });
      const checked = new User({ ...data, name: 'Bob', age: -1 });

      // Act
      await User.bulkSave([skipped]);
      const error = await User.bulkSave([checked], { validateBeforeSave: true }).then(() => null, err => err);

      // Assert
      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(await User.countDocuments(), 1);
      assert.strictEqual((await User.collection.findOne({ _id: skipped._id })).age, -1);
    });

    it('bulkSave forwards validateModifiedOnly without changing the schema default', async function() {
      // Arrange
      const { User, data } = createTestContext();
      const { insertedId } = await User.collection.insertOne({ ...data, name: undefined });
      const doc = await User.findById(insertedId);
      doc.age = 21;

      // Act
      await User.bulkSave([doc], { validateModifiedOnly: true, middleware: false });
      doc.age = 22;
      const error = await User.bulkSave([doc], { middleware: false }).then(() => null, err => err);

      // Assert
      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(error.errors.name.kind, 'required');
      assert.strictEqual((await User.collection.findOne({ _id: insertedId })).age, 21);
    });

    for (const failure of ['validation', 'duplicate key']) {
      for (const retry of ['bulkSave', 'save']) {
        it(`does not retain suppression after ${failure} failure before ${retry}`, async function() {
          // Arrange
          const { User, data, calls } = createTestContext();
          const doc = new User({ ...data, age: failure === 'validation' ? -1 : 20 });
          if (failure === 'duplicate key') {
            await User.collection.insertOne({ ...data, _id: doc._id });
          }

          // Act
          const error = await User.bulkSave([doc], { middleware: false }).then(() => null, err => err);

          // Assert
          assert.ok(error);
          assert.strictEqual(error.name, failure === 'validation' ? 'ValidationError' : 'MongoBulkWriteError');
          assert.strictEqual(calls.savePre, 0);
          assert.strictEqual(calls.childSavePre, 0);
          if (failure === 'duplicate key') {
            await User.collection.deleteOne({ _id: doc._id });
          }
          doc.age = 20;
          resetCalls(calls);
          await (retry === 'bulkSave' ? User.bulkSave([doc]) : doc.save());
          assert.strictEqual(calls.validatePre, 1);
          assert.strictEqual(calls.validatePost, 1);
          assert.strictEqual(calls.savePre, 1);
          assert.strictEqual(calls.savePost, 1);
          assert.strictEqual(calls.childSavePre, 2);
          assert.strictEqual(calls.childSavePost, 2);
        });
      }
    }

    for (const operation of ['bulkSave', 'insertOne', 'replaceOne']) {
      it(`${operation} preserves sessions and disabled timestamps under suppression`, async function() {
        // Arrange
        const { User, data } = createTestContext();
        const session = await db.startSession();
        const doc = new User(data);
        const write = sinon.spy(User.collection, 'bulkWrite');
        try {
          // Act
          await runOperation(User, operation, doc, { middleware: false, timestamps: false, session });

          // Assert
          const stored = await User.collection.findOne({ name: 'Alice' });
          assert.strictEqual(stored.age, 20);
          assert.strictEqual(stored.createdAt, undefined);
          assert.strictEqual(write.firstCall.args[1].session, session);
          if (operation === 'bulkSave') {
            assert.strictEqual(doc.$session(), session);
          }
        } finally {
          write.restore();
          await session.endSession();
        }
      });
    }

    for (const operation of ['insertOne', 'replaceOne']) {
      for (const perOperation of [false, true]) {
        it(`${operation} preserves skipValidation at ${perOperation ? 'operation' : 'bulk'} level`, async function() {
          // Arrange
          const { User, data, calls } = createTestContext();
          const write = operation === 'insertOne' ?
            { document: { ...data, age: -1 } } :
            { filter: { name: 'Alice' }, replacement: { ...data, age: -1 }, upsert: true };
          if (perOperation) {
            write.skipValidation = true;
          }

          // Act
          await User.bulkWrite([{ [operation]: write }], { middleware: false, skipValidation: !perOperation });

          // Assert
          assert.strictEqual((await User.collection.findOne({ name: 'Alice' })).age, -1);
          assert.strictEqual(calls.validatePre, 0);
          assert.strictEqual(calls.validatePost, 0);
        });
      }
    }

    function runOperation(User, operation, doc, options) {
      if (operation === 'bulkSave') {
        return User.bulkSave([doc], options);
      }
      const write = operation === 'insertOne' ?
        { document: doc } :
        { filter: { name: 'Alice' }, replacement: doc, upsert: true };
      return User.bulkWrite([{ [operation]: write }], options);
    }

    function assertSelectedHooks(calls, selection, operation) {
      assert.deepStrictEqual(calls, {
        validatePre: selection.pre,
        validatePost: selection.post,
        childValidatePre: 2 * selection.pre,
        childValidatePost: 2 * selection.post,
        savePre: operation === 'bulkSave' ? selection.pre : 0,
        savePost: operation === 'bulkSave' ? selection.post : 0,
        childSavePre: operation === 'bulkSave' ? 2 * selection.pre : 0,
        childSavePost: operation === 'bulkSave' ? 2 * selection.post : 0,
        bulkPre: selection.pre,
        bulkPost: selection.post
      });
    }

    function resetCalls(calls) {
      for (const key of Object.keys(calls)) {
        calls[key] = 0;
      }
    }

    function createTestContext({ validateBeforeSave = true } = {}) {
      const calls = {
        validatePre: 0, validatePost: 0, childValidatePre: 0, childValidatePost: 0,
        savePre: 0, savePost: 0, childSavePre: 0, childSavePost: 0, bulkPre: 0, bulkPost: 0
      };
      const events = [];
      const childSchema = new Schema({ age: { type: Number, validate: validator('child') } });
      const schema = new Schema({
        name: { type: String, required: true },
        age: { type: Number, validate: validator('parent') },
        profile: childSchema,
        children: [childSchema]
      }, { timestamps: true, validateBeforeSave });
      for (const [target, prefix, label] of [[schema, '', 'parent'], [childSchema, 'child', 'child']]) {
        for (const hook of ['validate', 'save']) {
          const key = prefix + (prefix ? hook[0].toUpperCase() + hook.slice(1) : hook);
          target.pre(hook, function() {
            calls[key + 'Pre']++;
            events.push(label + ':' + hook);
          });
          target.post(hook, function() { calls[key + 'Post']++; });
        }
      }
      schema.pre('bulkWrite', function() { calls.bulkPre++; });
      schema.post('bulkWrite', function() { calls.bulkPost++; });
      const User = db.model('User', schema);
      const data = { name: 'Alice', age: 20, profile: { age: 20 }, children: [{ age: 20 }] };
      return { User, calls, data, events };

      function validator(label) {
        return async function(age) {
          await new Promise(resolve => setImmediate(resolve));
          events.push(label + ':validated');
          return age >= 0;
        };
      }
    }
  });

  describe('validation middleware in write operations', function() {
    // Age must be 0 or greater.
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
    // Age must be 0 or greater.
    const operations = {
      validate: (User, data, options) => new User(data).validate(options),
      save: (User, data, options) => new User(data).save(options),
      'insertMany with plain objects': (User, data, options) => User.insertMany([data], options),
      'insertMany with documents': (User, data, options) => User.insertMany([new User(data)], options)
    };
    const selections = [
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'no middleware option', options: undefined, pre: 9, post: 9 },
      { name: 'middleware: { pre: false }', options: { middleware: { pre: false } }, pre: 0, post: 9 },
      { name: 'middleware: { post: false }', options: { middleware: { post: false } }, pre: 9, post: 0 }
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
            assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post, errors: 0, validators: 6 });
            assert.strictEqual(await User.collection.countDocuments(), operation === 'validate' ? 0 : 1);
          });
        }

        it('rejects invalid subdocuments without hooks or writes when middleware: false', async function() {
          // Arrange
          const { User, data, calls } = createTestContext();
          data.single.single.age = -1;
          data.children[0].children[0].age = -2;
          data.union.single.age = -3;

          // Act
          const error = await runOperation(User, data, { middleware: false }).then(() => null, err => err);

          // Assert
          assert.ok(error instanceof mongoose.Error.ValidationError);
          assert.ok(error.errors['single.single.age']);
          assert.ok(error.errors['children.0.children.0.age']);
          assert.ok(error.errors['union.single.age']);
          assert.strictEqual(await User.collection.countDocuments(), 0);
          assert.deepStrictEqual(calls, { pre: 0, post: 0, errors: 0, validators: 6 });
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
            assert.strictEqual(calls.validators, 6);
            assert.strictEqual(calls.pre, phase === 'pre' ? 0 : 9);
            assert.strictEqual(calls.post, phase === 'post' ? 0 : 7);
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
        user.union.children[0].age = 45;

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
        assert.strictEqual(persisted.union.children[0].age, operation === 'save' ? 45 : 30);
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
      const User = db.model('User', new Schema({
        single: parentSchema,
        children: [parentSchema],
        union: { type: 'Union', of: [parentSchema, String] }
      }));
      const data = {
        single: { single: { age: 20 }, children: [{ age: 30 }] },
        children: [{ single: { age: 20 }, children: [{ age: 30 }] }],
        union: { single: { age: 20 }, children: [{ age: 30 }] }
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

  describe('aggregate explain options after middleware', function() {
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const method of ['explain', 'exec']) {
      for (const selection of selections) {
        it(`${method} sends updated options with ${selection.name}`, async function() {
          // Arrange
          const { User, calls } = createTestContext();
          await User.collection.insertOne({ name: 'Alice' });
          const aggregate = User.aggregate([{ $match: { name: 'Alice' } }]).option({
            comment: 'original',
            ...selection.options
          });
          const driverCall = sinon.spy(User.collection, 'aggregate');
          try {
            // Act
            const result = await aggregate[method]();

            // Assert
            assert.strictEqual(driverCall.callCount, 1);
            const driverOptions = driverCall.firstCall.args[1];
            assert.strictEqual(driverOptions.comment, selection.pre ? 'set-by-pre-hook' : 'original');
            assert.strictEqual(driverOptions.allowDiskUse, selection.pre ? true : undefined);
            assert.strictEqual(Object.hasOwn(driverOptions, 'middleware'), false);
            assert.notStrictEqual(driverOptions, aggregate.options);
            assert.deepStrictEqual(aggregate.options.middleware, selection.options.middleware);
            assert.strictEqual(Object.hasOwn(aggregate.options, 'middleware'), Object.hasOwn(selection.options, 'middleware'));
            assert.strictEqual(calls.pre, selection.pre);
            assert.strictEqual(calls.post, selection.post);
            if (selection.post) {
              assert.strictEqual(calls.result, result);
            }
            if (method === 'exec') {
              assert.deepStrictEqual(result.map(doc => doc.name), ['Alice']);
            } else {
              assert.ok(result.queryPlanner || result.stages);
            }
          } finally {
            driverCall.restore();
          }
        });
      }
    }

    for (const failure of ['pre hook', 'driver']) {
      for (const skipPost of [false, true]) {
        it(`preserves ${failure} errors with post hooks ${skipPost ? 'disabled' : 'enabled'}`, async function() {
          // Arrange
          const { User, calls, preError } = createTestContext({ failPre: failure === 'pre hook' });
          const pipeline = failure === 'driver' ? [{ $invalidStage: {} }] : [{ $match: {} }];
          const aggregate = User.aggregate(pipeline).option({ middleware: { post: !skipPost } });
          const driverCall = sinon.spy(User.collection, 'aggregate');
          try {
            // Act
            const error = await aggregate.explain().then(() => null, err => err);

            // Assert
            assert.ok(error);
            assert.strictEqual(calls.pre, 1);
            assert.strictEqual(calls.post, 0);
            assert.strictEqual(calls.errors, skipPost ? 0 : 1);
            assert.strictEqual(driverCall.callCount, failure === 'pre hook' ? 0 : 1);
            if (failure === 'pre hook') {
              assert.strictEqual(error, preError);
            } else {
              assert.strictEqual(error.code, 40324);
              assert.strictEqual(Object.hasOwn(driverCall.firstCall.args[1], 'middleware'), false);
            }
            assert.deepStrictEqual(aggregate.options.middleware, { post: !skipPost });
          } finally {
            driverCall.restore();
          }
        });
      }
    }

    function createTestContext({ failPre = false } = {}) {
      const calls = { pre: 0, post: 0, errors: 0, result: null };
      const preError = new Error('pre-aggregate failed');
      const schema = new Schema({ name: String });
      schema.pre('aggregate', async function() {
        calls.pre++;
        await new Promise(resolve => setImmediate(resolve));
        this.options.comment = 'set-by-pre-hook';
        this.options.allowDiskUse = true;
        if (failPre) {
          throw preError;
        }
      });
      schema.post('aggregate', function(result) {
        calls.post++;
        calls.result = result;
      });
      schema.post('aggregate', function(error, result, next) {
        calls.errors++;
        next(error);
      });
      const User = db.model('User', schema);
      return { User, calls, preError };
    }
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

  describe('populated virtual hydration', function() {
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const virtualName of ['author', 'authors']) {
      for (const selection of selections) {
        it(`preserves ${virtualName} with ${selection.name}`, function() {
          // Arrange
          const { Post, Author, calls, createRaw } = createTestContext();
          const raw = createRaw(virtualName);

          // Act
          const doc = Post.hydrate(raw, null, { hydratedPopulatedDocs: true, ...selection.options });

          // Assert
          const author = virtualName === 'author' ? doc.author : doc.authors?.[0];
          assert.ok(author instanceof Author);
          assert.strictEqual(author.name, 'Ann');
          assert.ok(author._id.equals(doc.authorId));
          assert.strictEqual(author.isNew, false);
          assert.strictEqual(doc.isNew, false);
          assert.strictEqual(doc.isModified(), false);
          assert.strictEqual(doc.$$populatedVirtuals[virtualName], doc[virtualName]);
          assert.strictEqual(Object.hasOwn(doc._doc, virtualName), false);
          assert.strictEqual(Object.hasOwn(raw, virtualName), false);
          if (virtualName === 'authors') {
            assert.strictEqual(doc.authors.length, 1);
            assert.deepStrictEqual(doc.populated('authors'), [doc.authorId]);
          } else {
            // Ordinary hydration does not mark the single virtual as populated.
            assert.strictEqual(doc.populated('author'), undefined);
          }
          assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post });

          const normalDoc = Post.hydrate(createRaw(virtualName), null, { hydratedPopulatedDocs: true });
          assert.ok((virtualName === 'author' ? normalDoc.author : normalDoc.authors[0]) instanceof Author);
          assert.deepStrictEqual(calls, { pre: selection.pre + 1, post: selection.post + 1 });
        });
      }
    }

    for (const selection of selections) {
      it(`preserves raw virtual values without related hydration with ${selection.name}`, function() {
        // Arrange
        const { Post, calls, createRaw } = createTestContext();
        const raw = createRaw('author');
        raw.authors = [{ ...raw.author }];

        // Act
        const doc = Post.hydrate(raw, null, selection.options);

        // Assert
        assert.strictEqual(doc.author?.name, 'Ann');
        assert.strictEqual(doc.authors?.[0].name, 'Ann');
        assert.strictEqual(Object.getPrototypeOf(doc.author), Object.prototype);
        assert.strictEqual(Object.getPrototypeOf(doc.authors[0]), Object.prototype);
        assert.strictEqual(doc.populated('author'), undefined);
        assert.strictEqual(doc.populated('authors'), undefined);
        assert.strictEqual(Object.hasOwn(doc._doc, 'author'), false);
        assert.strictEqual(Object.hasOwn(doc._doc, 'authors'), false);
        assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post });
      });

      it(`preserves population after findOne with ${selection.name}`, async function() {
        // Arrange
        const { Post, Author, calls, createRaw } = createTestContext();
        const raw = createRaw('author');
        await Author.collection.insertOne(raw.author);
        delete raw.author;
        await Post.collection.insertOne(raw);

        // Act
        const doc = await Post.findOne({ _id: raw._id }, null, selection.options).populate(['author', 'authors']);

        // Assert
        assert.ok(doc.author instanceof Author);
        assert.ok(doc.authors[0] instanceof Author);
        assert.strictEqual(doc.author.name, 'Ann');
        assert.strictEqual(doc.authors[0].name, 'Ann');
        assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post });
      });
    }

    function createTestContext() {
      const calls = { pre: 0, post: 0 };
      const Author = db.model('Author', new Schema({ name: String }));
      const schema = new Schema({ title: String, authorId: Schema.Types.ObjectId });
      schema.virtual('author', { ref: 'Author', localField: 'authorId', foreignField: '_id', justOne: true });
      schema.virtual('authors', { ref: 'Author', localField: 'authorId', foreignField: '_id' });
      schema.pre('init', function() { calls.pre++; });
      schema.post('init', function() { calls.post++; });
      const Post = db.model('Post', schema);
      return { Post, Author, calls, createRaw };

      function createRaw(virtualName) {
        const author = { _id: new mongoose.Types.ObjectId(), name: 'Ann' };
        return {
          _id: new mongoose.Types.ObjectId(),
          title: 'Hydration',
          authorId: author._id,
          [virtualName]: virtualName === 'author' ? author : [author]
        };
      }
    }
  });

  describe('find result hydration', function() {
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const mode of ['find', 'populated find', 'deferred populated find', 'findOne', 'cursor']) {
      for (const selection of selections) {
        it(`${mode} respects ${selection.name} and preserves built-in initialization`, async function() {
          // Arrange
          const { User, Team, calls } = await createTestContext();

          // Act
          const docs = await readDocuments(User, mode, selection.options);

          // Assert
          assert.deepStrictEqual(docs.map(doc => doc.name), mode === 'findOne' ? ['Alice'] : ['Alice', 'Bob', 'Cara']);
          for (const doc of docs) {
            assert.ok(doc instanceof User);
            assert.strictEqual(doc.tier, 'basic');
            assert.strictEqual(doc.isNew, false);
            assert.strictEqual(doc.isModified(), false);
            assert.deepStrictEqual(doc.$__.shardval, { tenantId: 'north' });
            if (mode === 'populated find') {
              assert.ok(doc.team instanceof Team);
              assert.strictEqual(doc.team.name, 'Core');
            } else {
              assert.ok(doc.team instanceof mongoose.Types.ObjectId);
            }
          }
          assert.deepStrictEqual(calls, { pre: docs.length * selection.pre, post: docs.length * selection.post });

          const normalDocs = await User.find().sort('name');
          assert.deepStrictEqual(normalDocs.map(doc => doc.name), ['Alice', 'Bob', 'Cara']);
          assert.deepStrictEqual(calls, { pre: docs.length * selection.pre + 3, post: docs.length * selection.post + 3 });
        });
      }
    }

    for (const defaults of [false, null, undefined]) {
      it(`preserves defaults: ${defaults} and the session when init hooks are skipped`, async function() {
        // Arrange
        const { User, calls } = await createTestContext();
        const session = await db.startSession();
        try {
          // Act
          const docs = await User.find().setOptions({ middleware: false, defaults, session });

          // Assert
          assert.strictEqual(docs.length, 3);
          for (const doc of docs) {
            assert.strictEqual(doc.tier, defaults === false ? undefined : 'basic');
            assert.strictEqual(doc.$session(), session);
          }
          assert.deepStrictEqual(calls, { pre: 0, post: 0 });
        } finally {
          await session.endSession();
        }
      });
    }

    for (const populate of [false, true]) {
      it(`preserves lean results with populate: ${populate}`, async function() {
        // Arrange
        const { User, calls } = await createTestContext();
        const query = User.find().sort('name').lean().setOptions({ middleware: false });
        if (populate) {
          query.populate('team');
        }

        // Act
        const docs = await query;

        // Assert
        assert.deepStrictEqual(docs.map(doc => doc.name), ['Alice', 'Bob', 'Cara']);
        for (const doc of docs) {
          assert.strictEqual(Object.getPrototypeOf(doc), Object.prototype);
          assert.strictEqual(doc.tier, undefined);
          if (populate) {
            assert.strictEqual(Object.getPrototypeOf(doc.team), Object.prototype);
            assert.strictEqual(doc.team.name, 'Core');
          }
        }
        assert.deepStrictEqual(calls, { pre: 0, post: 0 });
      });
    }

    async function readDocuments(User, mode, options) {
      const query = mode === 'findOne' ? User.findOne({ name: 'Alice' }) : User.find().sort('name');
      query.setOptions(options);
      if (mode === 'populated find' || mode === 'deferred populated find') {
        query.populate('team');
      }
      if (mode === 'deferred populated find') {
        query.setOptions({ _deferPopulate: true });
      }
      if (mode === 'cursor') {
        const docs = [];
        for await (const doc of query.cursor()) {
          docs.push(doc);
        }
        return docs;
      }
      const result = await query;
      return mode === 'findOne' ? [result] : result;
    }

    async function createTestContext() {
      const calls = { pre: 0, post: 0 };
      const Team = db.model('Team', new Schema({ name: String }));
      const schema = new Schema({
        name: String,
        tenantId: String,
        tier: { type: String, default: 'basic' },
        team: { type: Schema.Types.ObjectId, ref: 'Team' }
      }, { shardKey: { tenantId: 1 } });
      schema.pre('init', function() { calls.pre++; });
      schema.post('init', function() { calls.post++; });
      const User = db.model('User', schema);
      const team = new mongoose.Types.ObjectId();
      await Team.collection.insertOne({ _id: team, name: 'Core' });
      await User.collection.insertMany(['Alice', 'Bob', 'Cara'].map(name => ({ name, tenantId: 'north', team })));
      return { User, Team, calls };
    }
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
