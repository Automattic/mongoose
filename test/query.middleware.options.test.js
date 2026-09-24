'use strict';

const start = require('./common');
const assert = require('assert');
const sinon = require('sinon');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('middleware query', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('query instance middleware', function() {
    const selections = [
      { name: 'no middleware option', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'middleware: { pre: false }', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'middleware: { post: false }', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const selection of selections) {
      it(`respects ${selection.name} with exec()`, async function() {

        const { User, calls, addInstanceHooks } = await createTestContext();
        const query = addInstanceHooks(User.find({ name: 'John' }).setOptions(selection.options));
        const users = await query.exec();

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

    describe('document query effective options', function() {
      const cases = [
        { name: 'later suppression without original options', original: undefined, options: { middleware: false }, pre: 0, post: 0 },
        ...selections.map(selection => ({ ...selection, original: selection.options, options: {} })),
        { name: 'false then true', original: { middleware: false }, options: { middleware: true }, pre: 1, post: 1 },
        { name: 'true then false', original: { middleware: true }, options: { middleware: false }, pre: 0, post: 0 },
        { name: 'pre then post suppression', original: { middleware: { pre: false } }, options: { middleware: { post: false } }, pre: 1, post: 0 },
        { name: 'post then pre suppression', original: { middleware: { post: false } }, options: { middleware: { pre: false } }, pre: 0, post: 1 }
      ];

      for (const operation of ['updateOne', 'deleteOne']) {
        for (const selection of cases) {
          it(`${operation} uses ${selection.name} for every hook layer`, async function() {

            const { User, user, calls, hookArgs, addInstanceHooks } = await createTestContext();
            const update = { name: 'John updated' };
            const query = addInstanceHooks(operation === 'updateOne' ?
              user.updateOne(update, selection.original) : user.deleteOne(selection.original));
            const result = await query.setOptions(selection.options);

            assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
            assert.deepStrictEqual(query.getFilter(), { _id: user._id, tenantId: 'north' });
            for (const layer of ['instance', 'query', 'document']) {
              assert.deepStrictEqual(calls[layer], { pre: selection.pre, post: selection.post }, layer);
            }
            assert.deepStrictEqual(calls.subdocument, operation === 'deleteOne' ?
              { pre: selection.pre, post: selection.post } : { pre: 0, post: 0 });
            if (selection.pre) {
              assert.strictEqual(hookArgs[0][0], user);
              if (operation === 'updateOne') {
                assert.strictEqual(hookArgs[0][1], update);
                assert.strictEqual(hookArgs[0][2], selection.original);
              } else if (selection.original != null) {
                assert.strictEqual(hookArgs[0][1], selection.original);
              } else {
                assert.deepStrictEqual(hookArgs[0][1], {});
              }
            }
            const stored = await User.collection.findOne({ _id: user._id });
            assert.strictEqual(stored?.name ?? null, operation === 'updateOne' ? 'John updated' : null);
            if (operation === 'deleteOne') {
              assert.strictEqual(user.$isDeleted(), true);
            }

            const later = User.hydrate(await User.collection.findOne({ name: 'Jane' }));
            const ordinary = operation === 'updateOne' ? later.updateOne({ name: 'Jane updated' }) : later.deleteOne();
            await addInstanceHooks(ordinary);
            for (const layer of ['instance', 'query', 'document']) {
              assert.deepStrictEqual(calls[layer], { pre: selection.pre + 1, post: selection.post + 1 }, layer);
            }
          });
        }

        it(`${operation} merges changed options, removals, and later query options`, async function() {

          const { User, user, hookArgs } = await createTestContext({ changeOptions(options) {
            options.maxTimeMS = 2000;
            options.hint = { _id: 1 };
            delete options.sort;
          } });
          const options = { comment: 'original', maxTimeMS: 1000, sort: { name: 1 }, collation: { locale: 'en' } };
          const write = sinon.spy(User.collection, operation);
          try {
            const query = operation === 'updateOne' ? user.updateOne({ name: 'John updated' }, options) : user.deleteOne(options);

            const result = await query.setOptions({ comment: 'later' });

            assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
            const driverOptions = write.firstCall.args[operation === 'updateOne' ? 2 : 1];
            assert.strictEqual(driverOptions.comment, 'later');
            assert.strictEqual(driverOptions.maxTimeMS, 2000);
            assert.deepStrictEqual(driverOptions.hint, { _id: 1 });
            assert.deepStrictEqual(driverOptions.collation, { locale: 'en' });
            assert.strictEqual(driverOptions.sort, undefined);
            assert.strictEqual(hookArgs[0][operation === 'updateOne' ? 2 : 1], options);
            assert.strictEqual(options.comment, 'original');
          } finally {
            write.restore();
          }
        });

        for (const format of ['object', 'array', 'map']) {
          it(`${operation} preserves document-hook changes inside ${format} sort options`, async function() {

            const { User, user } = await createTestContext({ changeOptions: options => {
              if (format === 'map') {
                options.sort.set('name', 'descending');
              } else if (format === 'array') {
                options.sort[0][0][1] = 'descending';
              } else {
                options.sort.name = 'descending';
              }
            } });
            const sort = format === 'map' ? new Map([['name', 'ascending']]) :
              format === 'array' ? [[['name', 'ascending']]] : { name: 'ascending' };
            const options = { sort };
            const query = operation === 'updateOne' ? user.updateOne({ name: 'John updated' }, options) : user.deleteOne(options);
            query.setOptions({ sort: { tenantId: 1 } });
            query.pre(function() {
              assert.deepStrictEqual(this.getOptions().sort, { name: -1, tenantId: 1 });
              // Older MongoDB versions do not support sort on single-document writes.
              delete this.options.sort;
            });
            const result = await query;

            assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
            const stored = await User.collection.findOne({ _id: user._id });
            assert.strictEqual(stored?.name ?? null, operation === 'updateOne' ? 'John updated' : null);
          });
        }

        for (const change of ['inherit', 'remove', 'null', 'replace', 'later session', 'later null']) {
          it(`${operation} preserves session precedence for ${change}`, async function() {

            const session = await db.startSession();
            const replacement = await db.startSession();
            const { User, user } = await createTestContext({ changeOptions(options) {
              if (change === 'remove') delete options.session;
              if (change === 'null') options.session = null;
              if (change === 'replace') options.session = replacement;
            } });
            user.$session(session);
            const options = change === 'inherit' ? { middleware: false } : { session };
            const write = sinon.spy(User.collection, operation);
            try {
              const query = operation === 'updateOne' ? user.updateOne({ name: 'John updated' }, options) : user.deleteOne(options);
              if (change === 'later session') query.setOptions({ session: replacement });
              if (change === 'later null') query.setOptions({ session: null });

              const result = await query;

              assert.strictEqual(operation === 'updateOne' ? result.modifiedCount : result.deletedCount, 1);
              const expected = change.includes('null') ? null :
                change === 'replace' || change === 'later session' ? replacement : session;
              assert.strictEqual(write.firstCall.args[operation === 'updateOne' ? 2 : 1].session, expected);
              assert.strictEqual(user.$session(), session);
            } finally {
              write.restore();
              await session.endSession();
              await replacement.endSession();
            }
          });
        }
      }

      for (const strict of [false, true]) {
        it(`honors later strict: ${strict} without replaying the original value`, async function() {

          const { User, user } = await createTestContext();
          const query = user.updateOne({ name: 'John updated', nickname: 'Johnny' }, { strict: !strict });
          await query.setOptions({ strict });
          const stored = await User.collection.findOne({ _id: user._id });

          assert.strictEqual(stored.name, 'John updated');
          assert.strictEqual(stored.nickname, strict ? undefined : 'Johnny');
        });
      }

      for (const updatePipeline of [false, true]) {
        it(`honors later updatePipeline: ${updatePipeline}`, async function() {

          const { User, user, hookArgs } = await createTestContext();
          const update = [{ $set: { name: 'John updated' } }];
          const options = { updatePipeline: !updatePipeline };
          const query = user.updateOne(update, options).setOptions({ updatePipeline });
          const error = await query.then(() => null, err => err);
          if (updatePipeline) {
            assert.ifError(error);
          } else {
            assert.match(error?.message ?? '', /Cannot pass an array to query updates/);
          }
          const stored = await User.collection.findOne({ _id: user._id });

          assert.strictEqual(stored.name, updatePipeline ? 'John updated' : 'John');
          assert.strictEqual(hookArgs[0][1], update);
          assert.strictEqual(hookArgs[0][2], options);
        });
      }

      it('keeps the already-deleted guard when suppression comes from setOptions', async function() {

        const { User, user } = await createTestContext();
        user.$isDeleted(true);
        await user.deleteOne().setOptions({ middleware: false });

        assert.strictEqual(await User.collection.countDocuments({ _id: user._id }), 1);
      });
    });

    async function createTestContext({ changeOptions } = {}) {
      const hookArgs = [];
      const calls = {
        instance: { pre: 0, post: 0 },
        query: { pre: 0, post: 0 },
        document: { pre: 0, post: 0 },
        subdocument: { pre: 0, post: 0 }
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
        userSchema.pre(operation, { document: true, query: false }, function(...args) {
          calls.document.pre++;
          hookArgs.push(args);
          if (changeOptions) {
            changeOptions(args[operation === 'updateOne' ? 2 : 1]);
          }
        });
        userSchema.post(operation, { document: true, query: false }, function() { calls.document.post++; });
      }
      addressSchema.pre('deleteOne', { document: true, query: false }, function() { calls.subdocument.pre++; });
      addressSchema.post('deleteOne', { document: true, query: false }, function() { calls.subdocument.post++; });
      const User = db.model('User', userSchema);
      const data = new User({ name: 'John', tenantId: 'north', address: { city: 'Amsterdam' } }).toObject();
      await User.collection.insertMany([data, { name: 'Jane', tenantId: 'south' }]);
      const user = User.hydrate(data);
      return { User, user, calls, hookArgs, addInstanceHooks };

      function addInstanceHooks(query) {
        query.pre(function() { calls.instance.pre++; });
        query.post(function() { calls.instance.post++; });
        return query;
      }

    }
  });

  describe('aggregate explain options after middleware', function() {
    const cases = [
      { method: 'explain', options: {}, pre: 1, post: 1 },
      { method: 'explain', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { method: 'exec', options: {}, pre: 1, post: 1 }
    ];
    for (const selection of cases) {
      const { method } = selection;
      it(`${method} sends updated options with ${JSON.stringify(selection.options)}`, async function() {
        const { User, calls } = createTestContext();

        await User.collection.insertOne({ name: 'Alice' });
        const aggregate = User.aggregate([{ $match: { name: 'Alice' } }]).option({
          comment: 'original',
          ...selection.options
        });
        const driverCall = sinon.spy(User.collection, 'aggregate');
        try {
          const result = await aggregate[method]();
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

    for (const failure of ['pre hook', 'driver']) {
      const skipPost = failure === 'driver';
      it(`preserves ${failure} errors with post hooks ${skipPost ? 'disabled' : 'enabled'}`, async function() {
        const { User, calls, preError } = createTestContext({ failPre: failure === 'pre hook' });
        const pipeline = failure === 'driver' ? [{ $invalidStage: {} }] : [{ $match: {} }];
        const aggregate = User.aggregate(pipeline).option({ middleware: { post: !skipPost } });
        const driverCall = sinon.spy(User.collection, 'aggregate');
        try {
          const error = await aggregate.explain().then(() => null, err => err);
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
});
