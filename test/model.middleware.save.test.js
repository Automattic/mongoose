'use strict';

const start = require('./common');
const assert = require('assert');
const sinon = require('sinon');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const selections = [
  { name: 'ordinary', options: {}, pre: 1, post: 1 },
  { name: 'disabled', options: { middleware: false }, pre: 0, post: 0 },
  { name: 'pre disabled', options: { middleware: { pre: false } }, pre: 0, post: 1 },
  { name: 'post disabled', options: { middleware: { post: false } }, pre: 1, post: 0 }
];

describe('middleware save', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

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
          const { User, calls, data } = createTestContext();
          const doc = new User(data);

          await runOperation(User, operation, doc, selection.options);
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

      }

      it(`${operation} rejects an async validator with middleware: false before writing`, async function() {
        const { User, data } = createTestContext();
        const doc = new User({ ...data, age: -1 });
        if (operation === 'replaceOne') {
          await User.collection.insertOne(data);
        }

        const error = await runOperation(User, operation, doc, { middleware: false }).then(() => null, err => err);

        assert.ok(error instanceof mongoose.Error.ValidationError);
        assert.strictEqual(error.errors.age.kind, 'user defined');
        const stored = await User.collection.findOne({ name: 'Alice' });
        assert.strictEqual(stored?.age, operation === 'replaceOne' ? 20 : undefined);
      });
    }

    it('bulkSave validates every document before sending any writes', async function() {
      const { User, data } = createTestContext();
      const docs = [new User(data), new User({ ...data, name: 'Bob', age: -1 })];

      const error = await User.bulkSave(docs, { middleware: false }).then(() => null, err => err);

      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(await User.countDocuments(), 0);
      assert.ok(docs.every(doc => doc.isNew));
    });

    it('bulkSave uses current children and middleware selection on repeated saves', async function() {
      const { User, data, calls } = createTestContext();
      const doc = new User(data);

      await User.bulkSave([doc], { middleware: false });
      doc.children.push({ age: 21 });
      resetCalls(calls);
      await User.bulkSave([doc], { validateBeforeSave: false });

      assert.strictEqual(calls.savePre, 1);
      assert.strictEqual(calls.savePost, 1);
      assert.strictEqual(calls.childSavePre, 3);
      assert.strictEqual(calls.childSavePost, 3);
      assert.strictEqual((await User.collection.findOne({ _id: doc._id })).children.length, 2);
    });

    it('bulkSave awaits validation before user save hooks', async function() {
      const { User, data, events } = createTestContext();

      await User.bulkSave([new User(data)]);

      assert.ok(events.indexOf('parent:validated') !== -1);
      assert.ok(events.indexOf('parent:validated') < events.indexOf('parent:save'));
      assert.ok(events.indexOf('child:validated') < events.indexOf('child:save'));
    });

    for (const options of [{ validateBeforeSave: false }, { skipValidation: true }]) {
      it(`bulkSave skips validation with ${Object.keys(options)[0]}`, async function() {
        const { User, data, calls } = createTestContext();
        const doc = new User({ ...data, name: undefined, age: -1 });

        await User.bulkSave([doc], options);

        assert.strictEqual((await User.collection.findOne({ _id: doc._id })).age, -1);
        assert.strictEqual(calls.validatePre, 0);
        assert.strictEqual(calls.validatePost, 0);
        assert.strictEqual(calls.savePre, 1);
        assert.strictEqual(calls.childSavePre, 2);
      });
    }

    it('bulkSave respects schema validation defaults and an explicit override', async function() {
      const { User, data } = createTestContext({ validateBeforeSave: false });
      const skipped = new User({ ...data, name: undefined, age: -1 });
      const checked = new User({ ...data, name: 'Bob', age: -1 });

      await User.bulkSave([skipped]);
      const error = await User.bulkSave([checked], { validateBeforeSave: true }).then(() => null, err => err);

      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(await User.countDocuments(), 1);
      assert.strictEqual((await User.collection.findOne({ _id: skipped._id })).age, -1);
    });

    it('bulkSave forwards validateModifiedOnly without changing the schema default', async function() {
      const { User, data } = createTestContext();

      const { insertedId } = await User.collection.insertOne({ ...data, name: undefined });
      const doc = await User.findById(insertedId);
      doc.age = 21;
      await User.bulkSave([doc], { validateModifiedOnly: true, middleware: false });
      doc.age = 22;
      const error = await User.bulkSave([doc], { middleware: false }).then(() => null, err => err);

      assert.ok(error instanceof mongoose.Error.ValidationError);
      assert.strictEqual(error.errors.name.kind, 'required');
      assert.strictEqual((await User.collection.findOne({ _id: insertedId })).age, 21);
    });

    for (const failure of ['validation', 'duplicate key']) {
      for (const retry of ['bulkSave', 'save']) {
        it(`does not retain suppression after ${failure} failure before ${retry}`, async function() {
          const { User, data, calls } = createTestContext();
          const doc = new User({ ...data, age: failure === 'validation' ? -1 : 20 });
          if (failure === 'duplicate key') {
            await User.collection.insertOne({ ...data, _id: doc._id });
          }

          const error = await User.bulkSave([doc], { middleware: false }).then(() => null, err => err);

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
        const { User, data } = createTestContext();

        const session = await db.startSession();
        const doc = new User(data);
        const write = sinon.spy(User.collection, 'bulkWrite');
        try {
          await runOperation(User, operation, doc, { middleware: false, timestamps: false, session });
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
          const { User, data, calls } = createTestContext();
          const write = operation === 'insertOne' ?
            { document: { ...data, age: -1 } } :
            { filter: { name: 'Alice' }, replacement: { ...data, age: -1 }, upsert: true };
          if (perOperation) {
            write.skipValidation = true;
          }

          await User.bulkWrite([{ [operation]: write }], { middleware: false, skipValidation: !perOperation });

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

  describe('overlapping saves from post hooks', function() {
    const cases = [
      { mode: 'detached', selection: selections[1] },
      { mode: 'awaited', selection: selections[1] },
      { mode: 'detached', selection: selections[3] }
    ];

    for (const { mode, selection } of cases) {
      it(`retains each save's child selection with a ${mode} ${selection.name} second save`, async function() {
        const { User, user, calls, validationStarted, release, getSecondSave } = createTestContext({ mode, selection });
        let firstSave;
        try {
          firstSave = user.save();
          if (mode === 'awaited') {
            await validationStarted;
          } else {
            await firstSave;
            await validationStarted;
          }

          // Assert the first write and its hooks before the second write can finish.
          assert.deepStrictEqual({ ...calls }, {
            parentPre: 1, parentPost: 1, childPre: 1, childPost: mode === 'awaited' ? 0 : 1
          });
          assert.strictEqual((await User.collection.findOne({ _id: user._id })).name, 'first');
          release();
          await Promise.all([firstSave, getSecondSave()]);
          assert.deepStrictEqual(calls, {
            parentPre: 1 + selection.pre, parentPost: 1 + selection.post,
            childPre: 1 + selection.pre, childPost: 1 + selection.post
          });
          assert.strictEqual((await User.collection.findOne({ _id: user._id })).name, 'second');
        } finally {
          release();
          await Promise.allSettled([firstSave, getSecondSave()]);
        }
      });
    }

    function createTestContext({ mode, selection }) {
      const calls = { parentPre: 0, parentPost: 0, childPre: 0, childPost: 0 };
      let secondStarted = false;
      let secondSave;
      let release;
      let signalValidation;
      const barrier = new Promise(resolve => { release = resolve; });
      const validationStarted = new Promise(resolve => { signalValidation = resolve; });
      const child = new Schema({ name: String });
      child.pre('save', function() { ++calls.childPre; });
      child.post('save', function(doc) {
        assert.strictEqual(doc, this);
        assert.strictEqual(arguments.length, 2);
        ++calls.childPost;
      });
      const schema = new Schema({
        name: {
          type: String,
          validate: async function() {
            if (secondStarted) {
              signalValidation();
              await barrier;
            }
            return true;
          }
        },
        child
      });
      schema.pre('save', function() { ++calls.parentPre; });
      schema.post('save', function(doc) {
        assert.strictEqual(doc, this);
        assert.strictEqual(arguments.length, 2);
        ++calls.parentPost;
        if (!secondStarted) {
          startSecondSave();
          if (mode === 'awaited') {
            return secondSave;
          }
        }
      });
      const User = db.model('User', schema);
      const user = new User({ name: 'first', child: { name: 'Ada' } });
      return { User, user, calls, validationStarted, release, getSecondSave: () => secondSave };

      function startSecondSave() {
        secondStarted = true;
        user.name = 'second';
        secondSave = user.save(selection.options);
        secondSave.catch(() => {});
        return secondSave;
      }
    }
  });

  describe('delegated save middleware', function() {
    it('retains built-in save processing with user hooks disabled', async function() {
      const { user, calls, advanceTime, firstTime, secondTime } = createTestContext();

      const result = await user.save({ middleware: false });

      assert.strictEqual(result, user);
      assert.deepStrictEqual(calls, {
        parentPre: 0, parentPost: 0,
        childPre: 0, childPost: 0
      });
      assert.strictEqual(user.isNew, false);
      assert.strictEqual(user.children[0].isNew, false);
      const stored = await user.constructor.collection.findOne({ _id: user._id });
      assert.deepStrictEqual(stored.createdAt, firstTime);
      assert.deepStrictEqual(stored.updatedAt, firstTime);
      assert.deepStrictEqual(stored.children[0].createdAt, firstTime);
      assert.deepStrictEqual(stored.children[0].updatedAt, firstTime);

      advanceTime();
      user.children[0].name = 'Beth';
      await user.save();
      const updated = await user.constructor.collection.findOne({ _id: user._id });
      assert.strictEqual(updated.children[0].name, 'Beth');
      assert.deepStrictEqual(updated.createdAt, firstTime);
      assert.deepStrictEqual(updated.updatedAt, secondTime);
      assert.deepStrictEqual(updated.children[0].updatedAt, secondTime);
      assert.deepStrictEqual(calls, {
        parentPre: 1, parentPost: 1,
        childPre: 1, childPost: 1
      });
    });

    it('retains validation through a delegated save with hooks disabled', async function() {
      const { user } = createTestContext();
      user.children[0].name = undefined;
      await assert.rejects(user.save({ middleware: false }), mongoose.Error.ValidationError);
      assert.strictEqual(await user.constructor.countDocuments(), 0);
    });

    it('excludes internal query hooks from custom document methods', async function() {
      const { user } = createTestContext();
      assert.strictEqual(await user.findOneAndUpdate(), 'Ann');
    });

    function createTestContext() {
      const calls = { parentPre: 0, parentPost: 0, childPre: 0, childPost: 0 };
      const firstTime = new Date('2020-01-01T00:00:00Z');
      const secondTime = new Date('2020-01-02T00:00:00Z');
      let now = firstTime;
      const timestamps = { currentTime: () => now };
      const child = new Schema({ name: { type: String, required: true } }, { timestamps });
      const schema = new Schema({ name: String, children: [child] }, { timestamps, suppressReservedKeysWarning: true });
      child.pre('save', function() { ++calls.childPre; });
      child.post('save', function() { ++calls.childPost; });
      schema.pre('save', function() { ++calls.parentPre; });
      schema.post('save', function() { ++calls.parentPost; });
      schema.methods.save = function(options) { return this.$save(options); };
      schema.methods.findOneAndUpdate = async function() { return this.name; };
      const User = db.model('User', schema);
      return {
        user: new User({ name: 'Ann', children: [{ name: 'Alice' }] }),
        calls, firstTime, secondTime, advanceTime: () => { now = secondTime; }
      };
    }
  });
});
