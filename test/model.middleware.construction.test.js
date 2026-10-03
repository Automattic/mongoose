'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware construction', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('createModel middleware selection', function() {
    const operations = {
      find: { run: (User, options) => User.find({}, null, options) },
      findOne: { run: async(User, options) => [await User.findOne({}, null, options)] },
      cursor: { run: async(User, options) => [await User.find({}, null, options).cursor().next()] },
      findOneAndUpdate: {
        run: async(User, options) => [await User.findOneAndUpdate({}, { name: 'Alice' }, options)]
      },
      findOneAndReplace: {
        run: async(User, options, data) => [await User.findOneAndReplace({}, data, { ...options, returnDocument: 'after' })]
      },
      replaceOne: {
        run: async(User, options, data) => {
          await User.replaceOne({}, data, options);
          return [await User.findOne({ _id: data._id }).lean()];
        },
        lean: true
      },
      hydrate: { run: (User, options, data) => [User.hydrate(data, null, options)] },
      create: { run: (User, options, data) => User.create([data], options) },
      'ordered create': {
        run: (User, options, data) => User.create([data], { ...options, ordered: true })
      },
      'aggregateErrors create': {
        run: (User, options, data) => User.create([data], { ...options, aggregateErrors: true })
      },
      insertMany: { run: (User, options, data) => User.insertMany([data], options) },
      insertOne: { run: async(User, options, data) => [await User.insertOne(data, options)] },
      'bulkWrite insertOne': {
        run: async(User, options, data) => {
          await User.bulkWrite([{ insertOne: { document: data } }], options);
          return [await User.findOne({ _id: data._id }).lean()];
        },
        lean: true
      },
      'bulkWrite replaceOne': {
        run: async(User, options, data) => {
          await User.bulkWrite([{ replaceOne: { filter: {}, replacement: data } }], options);
          return [await User.findOne({ _id: data._id }).lean()];
        },
        lean: true
      }
    };

    for (const [operation, { run, lean }] of Object.entries(operations)) {
      it(`${operation} suppresses construction hooks and retains discriminators`, async function() {
        const { User, Member, calls, childCalls, data } = createTestContext();
        const replacing = ['replaceOne', 'findOneAndReplace', 'bulkWrite replaceOne'].includes(operation);

        await User.collection.insertOne(replacing ? data : { ...data, _id: new mongoose.Types.ObjectId() });

        const [doc] = await run(User, { middleware: false }, data);

        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(childCalls, []);
        assert.strictEqual(doc.name, 'Alice');
        assert.strictEqual(doc.role, 'reader');
        assert.strictEqual(doc.membership, 'gold');
        if (!lean) {
          assert.ok(doc instanceof Member);
          assert.strictEqual(doc.isNew, false);
          assert.strictEqual(doc.isModified(), false);
        }
      });
    }

    for (const [middleware, enabled] of [[undefined, true], [false, false], [{ pre: false }, false], [{ post: false }, true]]) {
      it(`selects synchronous construction hooks with ${JSON.stringify(middleware)}`, function() {
        const { User, Member, calls, childCalls, data } = createTestContext();

        const user = new User(data, null, { middleware, defaults: false });

        assert.ok(user instanceof Member);
        assert.strictEqual(calls.length > 0, enabled);
        assert.ok(calls.every(context => context === data));
        assert.deepStrictEqual(childCalls, enabled ? [data] : []);
        assert.strictEqual(user.name, 'Alice');
        assert.strictEqual(user.role, undefined);
        assert.strictEqual(user.isNew, true);
      });
    }

    it('preserves hydration options when construction hooks are suppressed', function() {
      const { User, calls, data } = createTestContext();
      const user = User.hydrate({ ...data, nickname: 'Al' }, { name: 1, nickname: 1 }, {
        middleware: false, defaults: false, strict: false
      });

      assert.deepStrictEqual(calls, []);
      assert.strictEqual(user.name, 'Alice');
      assert.strictEqual(user.get('nickname'), 'Al');
      assert.strictEqual(user.role, undefined);
      assert.strictEqual(user.isSelected('role'), false);
    });

    it('cannot suppress construction that happened before save received options', async function() {
      const { User, calls, data } = createTestContext();
      const user = new User(data);
      const constructionCalls = calls.slice();

      assert.ok(constructionCalls.length > 0);

      await user.save({ middleware: false });
      assert.deepStrictEqual(calls, constructionCalls);
      assert.strictEqual(await User.countDocuments({ _id: user._id }), 1);
    });

    it('keeps construction errors enabled after a suppressed insert', async function() {
      const error = new Error('construction failed');
      const { User, calls, data } = createTestContext({ error });

      const [user] = await User.insertMany([data], { middleware: false });

      assert.strictEqual(user.name, 'Alice');
      assert.deepStrictEqual(calls, []);
      assert.throws(() => new User({ name: 'Bob' }), err => err === error);
      assert.strictEqual(calls.length, 1);
    });

    function createTestContext({ error } = {}) {
      const calls = [];
      const childCalls = [];
      const schema = new Schema({ name: String, role: { type: String, default: 'reader' } });
      schema.pre('createModel', function() {
        calls.push(this);
        if (error) {
          throw error;
        }
      });
      const User = db.model('User', schema);
      const memberSchema = new Schema({ membership: String });
      memberSchema.pre('createModel', function() { childCalls.push(this); });
      const Member = User.discriminator('Member', memberSchema);
      const data = { _id: new mongoose.Types.ObjectId(), name: 'Alice', __t: 'Member', membership: 'gold' };
      return { User, Member, calls, childCalls, data };
    }
  });
});
