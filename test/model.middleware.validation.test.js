'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const selections = [
  { name: 'ordinary', options: {}, pre: 1, post: 1 },
  { name: 'disabled', options: { middleware: false }, pre: 0, post: 0 },
  { name: 'pre disabled', options: { middleware: { pre: false } }, pre: 0, post: 1 },
  { name: 'post disabled', options: { middleware: { post: false } }, pre: 1, post: 0 }
];

describe('middleware validation', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

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

        for (const [middleware, pre, post] of [
          [false, 0, 0],
          [undefined, documentCount, documentCount],
          [{ pre: false }, 0, documentCount],
          [{ post: false }, documentCount, 0]
        ]) {
          it(`selects validation hooks with ${JSON.stringify(middleware)}`, async function() {
            const { User, calls } = createTestContext();

            await runOperation(User, [20, 30], { middleware });

            assert.deepStrictEqual(calls, { pre, post, validators: documentCount });
            assert.strictEqual(await User.collection.countDocuments(), documentCount);
          });
        }

        it('rejects invalid documents without writing when middleware: false', async function() {
          const { User, calls } = createTestContext();

          const error = await runOperation(User, [-1, -2], { middleware: false }).then(() => null, err => err);

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
        for (const selection of operation === 'validate' ? selections : selections.slice(0, 1)) {
          it(`respects ${selection.name} at each nesting level`, async function() {
            const { User, data, calls } = createTestContext();

            await runOperation(User, data, selection.options);

            assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post, errors: 0, validators: 6 });
            assert.strictEqual(await User.collection.countDocuments(), operation === 'validate' ? 0 : 1);
          });
        }

        it('rejects invalid subdocuments without hooks or writes when middleware: false', async function() {
          const { User, data, calls } = createTestContext();
          data.single.single.age = -1;
          data.children[0].children[0].age = -2;
          data.union.single.age = -3;

          const error = await runOperation(User, data, { middleware: false }).then(() => null, err => err);

          assert.ok(error instanceof mongoose.Error.ValidationError);
          assert.ok(error.errors['single.single.age']);
          assert.ok(error.errors['children.0.children.0.age']);
          assert.ok(error.errors['union.single.age']);
          assert.strictEqual(await User.collection.countDocuments(), 0);
          assert.deepStrictEqual(calls, { pre: 0, post: 0, errors: 0, validators: 6 });
        });

        for (const phase of operation === 'validate' ? ['pre', 'post'] : []) {
          it(`respects middleware: { ${phase}: false } for validation errors`, async function() {
            const { User, data, calls } = createTestContext();
            data.single.single.age = -1;

            const error = await runOperation(User, data, { middleware: { [phase]: false } }).then(() => null, err => err);

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
        const { User, data, calls } = createTestContext();
        const stored = new User(data).toObject();

        await User.collection.insertOne(stored);
        const user = User.hydrate(stored);
        user.single.single.age = 25;
        user.children[0].children[0].age = 35;
        user.union.children[0].age = 45;
        await user[operation]({ middleware: false });

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

  describe('query and static validation', function() {
    // Age must be nonnegative. These operations use 20 as valid data and -1 as invalid data.
    const operations = {
      updateOne: { selection: selections[2], run: (User, id, age, options) => User.updateOne({ _id: id }, { $set: { child: { age } } }, options) },
      findOneAndUpdate: { run: (User, id, age, options) => User.findOneAndUpdate({ _id: id }, { $set: { child: { age } } }, options) },
      replaceOne: { parent: true, run: (User, id, age, options) => User.replaceOne({ _id: id }, { child: { age } }, options) },
      findOneAndReplace: { selection: selections[3], parent: true, run: (User, id, age, options) => User.findOneAndReplace({ _id: id }, { child: { age } }, options) },
      'array element': { array: true, run: (User, id, age, options) => User.updateOne({ _id: id }, { $set: { 'children.0': { age } } }, options) },
      $push: { array: true, run: (User, id, age, options) => User.updateOne({ _id: id }, { $push: { children: { $each: [{ age }] } } }, options) },
      'Model.validate': { static: true, run: (User, id, age, options) => User.validate({ child: { age } }, options) }
    };

    for (const [name, operation] of Object.entries(operations)) {
      const selection = operation.selection || selections[1];
      it(`${name} forwards ${selection.name} selection and retains validators`, async function() {
        const { User, id, calls, resetCalls } = await createTestContext();
        const options = { runValidators: true, ...selection.options };

        const result = await operation.run(User, id, '20', options);

        assert.deepStrictEqual(calls, {
          parentPre: operation.parent ? selection.pre : 0,
          parentPost: operation.parent ? selection.post : 0,
          childPre: selection.pre,
          childPost: selection.post,
          validators: 1
        });
        if (operation.static) {
          assert.strictEqual(result.child.age, 20);
        } else {
          const stored = await User.collection.findOne({ _id: id });
          assert.strictEqual(operation.array ? stored.children.at(-1).age : stored.child.age, 20);
        }
        const before = await User.collection.findOne({ _id: id });
        resetCalls();
        await assert.rejects(operation.run(User, id, -1, options), mongoose.Error.ValidationError);
        assert.strictEqual(calls.validators, 1);
        assert.strictEqual(calls.childPre, selection.pre);
        assert.deepStrictEqual(await User.collection.findOne({ _id: id }), before);

        resetCalls();
        await operation.run(User, id, 21, { runValidators: true });
        assert.strictEqual(calls.childPre, 1);
        assert.strictEqual(calls.childPost, 1);
      });

      if (name === 'updateOne' || name === 'replaceOne') {
        it(`${name} does not enable validators with middleware alone`, async function() {
          const { User, id, calls } = await createTestContext();
          await operation.run(User, id, -1, { middleware: false });
          assert.strictEqual(calls.validators, 0);
          assert.strictEqual(calls.childPre, 0);
          const stored = await User.collection.findOne({ _id: id });
          assert.strictEqual(operation.array ? stored.children.at(-1).age : stored.child.age, -1);
        });
      }
    }

    it('retains static selected paths and validator context', async function() {
      const { User, calls } = await createTestContext();
      const data = { child: { age: '-1' } };
      const result = await User.validate(data, { pathsToSkip: ['child'], middleware: false });
      assert.strictEqual(result.child.age, -1);
      assert.strictEqual(calls.validators, 0);
      await assert.rejects(User.validate({ child: { age: 'invalid' } }, { middleware: false }), mongoose.Error.ValidationError);
      assert.strictEqual(data.child.age, '-1');
    });

    async function createTestContext() {
      const calls = { parentPre: 0, parentPost: 0, childPre: 0, childPost: 0, validators: 0 };
      const child = new Schema({ age: { type: Number, validate: function(age) {
        calls.validators++;
        assert.strictEqual(this.age, age);
        return age >= 0;
      } } });
      child.pre('validate', function() { calls.childPre++; });
      child.post('validate', function() { calls.childPost++; });
      const schema = new Schema({ child, children: [child] });
      schema.pre('validate', function() { calls.parentPre++; });
      schema.post('validate', function() { calls.parentPost++; });
      const User = db.model('User', schema);
      const id = new mongoose.Types.ObjectId();
      await User.collection.insertOne({ _id: id, child: { age: 10 }, children: [{ age: 10 }] });
      return { User, id, calls, resetCalls };

      function resetCalls() {
        for (const key of Object.keys(calls)) {
          calls[key] = 0;
        }
      }
    }
  });

  describe('upsert default child middleware', function() {
    const operations = ['updateOne', 'findOneAndUpdate', 'bulk updateOne', 'bulk updateMany'];
    for (const operation of operations) {
      const selection = operation.startsWith('bulk') ? selections[3] : selections[2];
      it(`${operation} forwards selection to default children`, async function() {
        const { User, calls, run } = createTestContext({ operation });

        await run(selection.options);

        assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post });
        const stored = await User.collection.findOne({ key: 'new' });
        assert.strictEqual(stored.children[0].name, 'Ann');
        assert.strictEqual(stored.label, operation.startsWith('bulk') ? 'bulk' : 'new');
        assert.strictEqual(await User.collection.countDocuments({ key: 'new' }), 1);
      });
    }

    for (const operation of ['updateOne', 'bulk updateOne']) {
      it(`${operation} keeps setDefaultsOnInsert false effective`, async function() {
        const { User, calls, run } = createTestContext({ operation });

        await run({ middleware: false, setDefaultsOnInsert: false });

        assert.deepStrictEqual(calls, { pre: 0, post: 0 });
        const stored = await User.collection.findOne({ key: 'new' });
        assert.ok(stored);
        assert.strictEqual(stored.children, undefined);
        assert.strictEqual(stored.label, undefined);
      });
    }

    function createTestContext({ operation }) {
      const calls = { pre: 0, post: 0 };
      const childSchema = new Schema({ name: String });
      childSchema.pre('init', function() { ++calls.pre; });
      childSchema.post('init', function() { ++calls.post; });
      const User = db.model('User', new Schema({
        key: String,
        label: { type: String, default: function() { return this instanceof mongoose.Query ? this.getFilter().key : 'bulk'; } },
        children: { type: [childSchema], default: [{ name: 'Ann' }] }
      }));
      return { User, calls, run };

      function run(options) {
        const filter = { key: 'new' };
        const update = { $set: { key: 'new' } };
        if (operation.startsWith('bulk')) {
          return User.bulkWrite([{ [operation.slice(5)]: { filter, update, upsert: true, setDefaultsOnInsert: options.setDefaultsOnInsert } }], options);
        }
        return User[operation](filter, update, { upsert: true, returnDocument: 'after', lean: true, ...options });
      }
    }
  });
});
