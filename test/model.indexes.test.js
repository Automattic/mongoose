'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

describe('model', function() {
  let db;

  before(function() {
    db = start();

    return db.createCollection('Test').catch(() => {});
  });

  after(function(done) {
    db.close(done);
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('indexes', function() {
    this.timeout(5000);

    it('are created when model is compiled', function() {
      const Indexed = new Schema({
        name: { type: String, index: true },
        last: String,
        email: String,
        date: Date
      });

      Indexed.index({ last: 1, email: 1 }, { unique: true });
      Indexed.index({ date: 1 }, { expires: 10 });

      const IndexedModel = db.model('Test', Indexed);
      let assertions = 0;

      return co(function*() {
        yield cb => IndexedModel.on('index', () => cb());
        const indexes = yield IndexedModel.collection.getIndexes({ full: true });

        indexes.forEach(function(index) {
          switch (index.name) {
            case '_id_':
            case 'name_1':
            case 'last_1_email_1':
              assertions++;
              break;
            case 'date_1':
              assertions++;
              assert.equal(index.expireAfterSeconds, 10);
              break;
          }
        });

        assert.equal(assertions, 4);
      });
    });

    it('of embedded documents', function(done) {
      const BlogPosts = new Schema({
        _id: { type: ObjectId, index: true },
        title: { type: String, index: true },
        desc: String
      });

      const User = new Schema({
        name: { type: String, index: true },
        blogposts: [BlogPosts]
      });

      const UserModel = db.model('Test', User);
      let assertions = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          function iter(index) {
            if (index[0] === 'name') {
              assertions++;
            }
            if (index[0] === 'blogposts._id') {
              assertions++;
            }
            if (index[0] === 'blogposts.title') {
              assertions++;
            }
          }

          for (const i in indexes) {
            indexes[i].forEach(iter);
          }

          assert.equal(assertions, 3);
          done();
        });
      });
    });

    it('of embedded documents unless excludeIndexes (gh-5575) (gh-8343)', function(done) {
      const BlogPost = Schema({
        _id: { type: ObjectId },
        title: { type: String, index: true },
        desc: String
      });
      const otherSchema = Schema({
        name: { type: String, index: true }
      }, { excludeIndexes: true });

      const User = new Schema({
        name: { type: String, index: true },
        blogposts: {
          type: [BlogPost],
          excludeIndexes: true
        },
        otherblogposts: [{ type: BlogPost, excludeIndexes: true }],
        blogpost: {
          type: BlogPost,
          excludeIndexes: true
        },
        otherArr: [otherSchema]
      });

      const UserModel = db.model('Test', User);

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          // Should only have _id and name indexes
          const indexNames = Object.keys(indexes);
          assert.deepEqual(indexNames.sort(), ['_id_', 'name_1']);
          done();
        });
      });
    });

    it('of multiple embedded documents with same schema', function(done) {
      const BlogPosts = new Schema({
        _id: { type: ObjectId, unique: true },
        title: { type: String, index: true },
        desc: String
      });

      const User = new Schema({
        name: { type: String, index: true },
        blogposts: [BlogPosts],
        featured: [BlogPosts]
      });

      const UserModel = db.model('Test', User);
      let assertions = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          function iter(index) {
            if (index[0] === 'name') {
              ++assertions;
            }
            if (index[0] === 'blogposts._id') {
              ++assertions;
            }
            if (index[0] === 'blogposts.title') {
              ++assertions;
            }
            if (index[0] === 'featured._id') {
              ++assertions;
            }
            if (index[0] === 'featured.title') {
              ++assertions;
            }
          }

          for (const i in indexes) {
            indexes[i].forEach(iter);
          }

          assert.equal(assertions, 5);
          done();
        });
      });
    });

    it('compound: on embedded docs', function(done) {
      const BlogPosts = new Schema({
        title: String,
        desc: String
      });

      BlogPosts.index({ title: 1, desc: 1 });

      const User = new Schema({
        name: { type: String, index: true },
        blogposts: [BlogPosts]
      });

      const UserModel = db.model('Test', User);
      let found = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          for (const index in indexes) {
            switch (index) {
              case 'name_1':
              case 'blogposts.title_1_blogposts.desc_1':
                ++found;
                break;
            }
          }

          assert.equal(found, 2);
          done();
        });
      });
    });

    it('nested embedded docs (gh-5199)', function(done) {
      const SubSubSchema = mongoose.Schema({
        nested2: String
      });

      SubSubSchema.index({ nested2: 1 });

      const SubSchema = mongoose.Schema({
        nested1: String,
        subSub: SubSubSchema
      });

      SubSchema.index({ nested1: 1 });

      const ContainerSchema = mongoose.Schema({
        nested0: String,
        sub: SubSchema
      });

      ContainerSchema.index({ nested0: 1 });

      assert.deepEqual(ContainerSchema.indexes().map(function(v) { return v[0]; }), [
        { 'sub.subSub.nested2': 1 },
        { 'sub.nested1': 1 },
        { nested0: 1 }
      ]);

      done();
    });

    it('primitive arrays (gh-3347)', function(done) {
      const schema = new Schema({
        arr: [{ type: String, unique: true }]
      });

      const indexes = schema.indexes();
      assert.equal(indexes.length, 1);
      assert.deepEqual(indexes[0][0], { arr: 1 });
      assert.ok(indexes[0][1].unique);

      done();
    });

    it('error should emit on the model', function(done) {
      const schema = new Schema({ name: { type: String } });
      const Test = db.model('Test', schema);

      Test.create({ name: 'hi' }, { name: 'hi' }, function(err) {
        assert.strictEqual(err, null);
        Test.schema.index({ name: 1 }, { unique: true });
        Test.schema.index({ other: 1 });

        Test.on('index', function(err) {
          assert.ok(/E11000 duplicate key error/.test(err.message), err);
          done();
        });

        delete Test.$init;
        Test.init().catch(() => {});
      });
    });

    it('when one index creation errors', function(done) {
      const userSchema = {
        name: { type: String },
        secondValue: { type: Boolean }
      };

      const User = new Schema(userSchema);
      User.index({ name: 1 });

      const User2 = new Schema(userSchema);
      User2.index({ name: 1 }, { unique: true });
      User2.index({ secondValue: 1 });

      db.model('Test1', User, 'Test');

      // Create model with second schema in same collection to add new indexes
      const UserModel2 = db.model('Test2', User2, 'Test');
      let assertions = 0;

      UserModel2.on('index', function() {
        UserModel2.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          function iter(index) {
            if (index[0] === 'name') {
              assertions++;
            }
            if (index[0] === 'secondValue') {
              assertions++;
            }
          }

          for (const i in indexes) {
            indexes[i].forEach(iter);
          }

          assert.equal(assertions, 2);
          done();
        });
      });
    });

    it('creates descending indexes from schema definition(gh-8895)', function() {
      return co(function*() {
        const userSchema = new Schema({
          name: { type: String, index: -1 },
          address: { type: String, index: '-1' }
        });

        const User = db.model('User', userSchema);

        yield User.init();

        const indexes = yield User.collection.getIndexes();

        assert.ok(indexes['name_-1']);
        assert.ok(indexes['address_-1']);
      });
    });

    describe('auto creation', function() {
      it('can be disabled', function(done) {
        const schema = new Schema({ name: { type: String, index: true } });
        schema.set('autoIndex', false);

        const Test = db.model('Test', schema);
        Test.on('index', function() {
          assert.ok(false, 'Model.ensureIndexes() was called');
        });

        // Create a doc because mongodb 3.0 getIndexes errors if db doesn't
        // exist
        Test.create({ name: 'Bacon' }, function(err) {
          assert.ifError(err);
          setTimeout(function() {
            Test.collection.getIndexes(function(err, indexes) {
              assert.ifError(err);
              // Only default _id index should exist
              assert.deepEqual(['_id_'], Object.keys(indexes));
              done();
            });
          }, 100);
        });
      });

      describe('global autoIndexes (gh-1875)', function() {
        it('will create indexes as a default', function(done) {
          const schema = new Schema({ name: { type: String, index: true } });
          const Test = db.model('Test', schema);
          Test.on('index', function(error) {
            assert.ifError(error);
            assert.ok(true, 'Model.ensureIndexes() was called');
            Test.collection.getIndexes(function(err, indexes) {
              assert.ifError(err);
              assert.equal(Object.keys(indexes).length, 2);
              done();
            });
          });
        });

        it('will not create indexes if the global auto index is false and schema option isnt set (gh-1875)', function(done) {
          const db = start({ config: { autoIndex: false } });
          const schema = new Schema({ name: { type: String, index: true } });
          const Test = db.model('Test', schema);
          Test.on('index', function() {
            assert.ok(false, 'Model.ensureIndexes() was called');
          });

          Test.create({ name: 'Bacon' }, function(err) {
            assert.ifError(err);
            setTimeout(function() {
              Test.collection.getIndexes(function(err, indexes) {
                assert.ifError(err);
                assert.deepEqual(['_id_'], Object.keys(indexes));
                db.close(done);
              });
            }, 100);
          });
        });
      });
    });

    describe.skip('model.ensureIndexes()', function() {
      it('is a function', function(done) {
        const schema = mongoose.Schema({ x: 'string' });
        const Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        assert.equal(typeof Test.ensureIndexes, 'function');
        done();
      });

      it('returns a Promise', function(done) {
        const schema = mongoose.Schema({ x: 'string' });
        const Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        const p = Test.ensureIndexes();
        assert.ok(p instanceof mongoose.Promise);
        done();
      });

      it('creates indexes', function(done) {
        const schema = new Schema({ name: { type: String } });
        const Test = db.model('ManualIndexing' + random(), schema, 'x' + random());

        Test.schema.index({ name: 1 }, { sparse: true });

        let called = false;
        Test.on('index', function() {
          called = true;
        });

        Test.ensureIndexes(function(err) {
          assert.ifError(err);
          assert.ok(called);
          done();
        });
      });
    });
  });

  it('sets correct partialFilterExpression for document array (gh-9091)', function() {
    const childSchema = new Schema({ name: String });
    childSchema.index({ name: 1 }, { partialFilterExpression: { name: { $exists: true } } });
    const schema = new Schema({ arr: [childSchema] });
    const Model = db.model('Test', schema);

    return co(function*() {
      yield Model.init();

      yield Model.syncIndexes();
      const indexes = yield Model.listIndexes();

      assert.equal(indexes.length, 2);
      assert.ok(indexes[1].partialFilterExpression);
      assert.deepEqual(indexes[1].partialFilterExpression, {
        'arr.name': { $exists: true }
      });
    });
  });

  it('skips automatic indexing on childSchema if autoIndex: false (gh-9150)', function() {
    const nestedSchema = mongoose.Schema({
      name: { type: String, index: true }
    }, { autoIndex: false });
    const schema = mongoose.Schema({
      nested: nestedSchema,
      top: { type: String, index: true }
    });
    let Model;

    return Promise.resolve().
      then(() => {
        Model = db.model('Model', schema);
        return Model.init();
      }).
      then(() => Model.listIndexes()).
      then(indexes => {
        assert.equal(indexes.length, 2);
        assert.deepEqual(indexes[1].key, { top: 1 });
      });
  });

  describe('discriminators with unique', function() {
    this.timeout(5000);

    it('converts to partial unique index (gh-6347)', function() {
      const baseOptions = { discriminatorKey: 'kind' };
      const baseSchema = new Schema({}, baseOptions);

      const Base = db.model('Test', baseSchema);

      const userSchema = new Schema({
        emailId: { type: String, unique: true }, // Should become a partial
        firstName: { type: String }
      });

      const User = Base.discriminator('User', userSchema);

      const deviceSchema = new Schema({
        _id: { type: Schema.ObjectId, auto: true },
        name: { type: String, unique: true }, // Should become a partial
        model: { type: String }
      });

      const Device = Base.discriminator('Device', deviceSchema);

      return Promise.all([
        Base.init(),
        User.init(),
        Device.init(),
        Base.create({}),
        User.create({ emailId: 'val@karpov.io', firstName: 'Val' }),
        Device.create({ name: 'Samsung', model: 'Galaxy' })
      ]);
    });

    it('decorated discriminator index with syncIndexes (gh-6347)', function() {
      const baseOptions = { discriminatorKey: 'kind' };
      const baseSchema = new Schema({}, baseOptions);

      const Base = db.model('Test', baseSchema);

      const userSchema = new Schema({
        emailId: { type: String, unique: true }, // Should become a partial
        firstName: { type: String }
      });

      const User = Base.discriminator('User', userSchema);

      return User.init().
        then(() => User.syncIndexes()).
        then(dropped => assert.equal(dropped.length, 0));
    });

    it('different collation with syncIndexes() (gh-8521)', function() {
      return co(function*() {
        yield db.db.collection('User').drop().catch(() => {});

        let userSchema = new mongoose.Schema({ username: String });
        userSchema.index({ username: 1 }, { unique: true });
        let User = db.model('User', userSchema, 'User');

        yield User.init();
        let indexes = yield User.listIndexes();
        assert.equal(indexes.length, 2);
        assert.deepEqual(indexes[1].key, { username: 1 });
        assert.ok(!indexes[1].collation);

        userSchema = new mongoose.Schema({ username: String }, { autoIndex: false });
        userSchema.index({ username: 1 }, {
          unique: true,
          collation: {
            locale: 'en',
            strength: 2
          }
        });
        db.deleteModel('User');
        User = db.model('User', userSchema, 'User');

        yield User.syncIndexes();

        indexes = yield User.listIndexes();
        assert.equal(indexes.length, 2);
        assert.deepEqual(indexes[1].key, { username: 1 });
        assert.ok(!!indexes[1].collation);

        yield User.collection.drop();
      });
    });

    it('reports syncIndexes() error (gh-9303)', function() {
      return co(function*() {
        let userSchema = new mongoose.Schema({ username: String, email: String });
        let User = db.model('User', userSchema);

        yield User.createCollection().catch(() => {});
        let indexes = yield User.listIndexes();
        assert.equal(indexes.length, 1);

        yield User.create([{ username: 'test', email: 'foo@bar' }, { username: 'test', email: 'foo@bar' }]);

        userSchema = new mongoose.Schema({ username: String, email: String }, { autoIndex: false });
        userSchema.index({ username: 1 }, { unique: true });
        userSchema.index({ email: 1 });
        db.deleteModel('User');
        User = db.model('User', userSchema, 'User');

        const err = yield User.syncIndexes().then(() => null, err => err);
        assert.ok(err);
        assert.equal(err.code, 11000);

        indexes = yield User.listIndexes();
        assert.equal(indexes.length, 2);
        assert.deepEqual(indexes[1].key, { email: 1 });

        yield User.collection.drop();
      });
    });

    it('cleanIndexes (gh-6676)', function() {
      return co(function*() {
        let M = db.model('Test', new Schema({
          name: { type: String, index: true }
        }, { autoIndex: false }), 'Test');

        yield M.createIndexes();

        let indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 },
          { name: 1 }
        ]);

        M = db.model('Test', new Schema({
          name: String
        }, { autoIndex: false }), 'Test');

        yield M.cleanIndexes();
        indexes = yield M.listIndexes();
        assert.deepEqual(indexes.map(i => i.key), [
          { _id: 1 }
        ]);
      });
    });
  });
});
