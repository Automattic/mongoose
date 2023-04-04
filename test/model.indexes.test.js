'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

describe('model', function() {
  let db;

  before(function() {
    db = start();

    return db.createCollection('Test').catch(() => {});
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('indexes', function() {
    this.timeout(5000);

    it('are created when model is compiled', async function() {
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

      await IndexedModel.init();

      const indexes = await IndexedModel.collection.getIndexes({ full: true });

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

    it('of embedded documents', async function() {
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

      await UserModel.init();

      const mongoIndexes = Object.values(await UserModel.collection.getIndexes());

      for (const mongoIndex in mongoIndexes) {
        mongoIndexes[mongoIndex].forEach(function iter(mongoIndex) {
          if (mongoIndex[0] === 'name') {
            assertions++;
          }
          if (mongoIndex[0] === 'blogposts._id') {
            assertions++;
          }
          if (mongoIndex[0] === 'blogposts.title') {
            assertions++;
          }
        });
      }

      assert.equal(assertions, 3);
    });

    it('of embedded documents unless excludeIndexes (gh-5575) (gh-8343)', async function() {
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
      await UserModel.init();

      const indexes = await UserModel.collection.getIndexes();

      // Should only have _id and name indexes
      const indexNames = Object.keys(indexes);
      assert.deepEqual(indexNames.sort(), ['_id_', 'name_1']);
    });

    it('of multiple embedded documents with same schema', async function() {
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

      await UserModel.init();

      const mongoIndexesNames = Object.values(await UserModel.collection.getIndexes()).map(indexArray => indexArray[0][0]);

      const existingIndexesMap = {
        name: false,
        'blogposts._id': false,
        'blogposts.title': false,
        'featured._id': false,
        'featured.title': false
      };

      for (const mongoIndexName of mongoIndexesNames) {
        if (existingIndexesMap[mongoIndexName] != null) {
          existingIndexesMap[mongoIndexName] = true;
        }
      }

      assert.deepEqual(
        existingIndexesMap,
        {
          name: true,
          'blogposts._id': true,
          'blogposts.title': true,
          'featured._id': true,
          'featured.title': true
        }
      );
    });

    it('compound: on embedded docs', async function() {
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

      await UserModel.init();

      const indexes = await UserModel.collection.getIndexes();

      for (const index in indexes) {
        switch (index) {
          case 'name_1':
          case 'blogposts.title_1_blogposts.desc_1':
            ++found;
            break;
        }
      }

      assert.equal(found, 2);
    });

    it('nested embedded docs (gh-5199)', function() {
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
    });

    it('primitive arrays (gh-3347)', function() {
      const schema = new Schema({
        arr: [{ type: String, unique: true }]
      });

      const indexes = schema.indexes();
      assert.equal(indexes.length, 1);
      assert.deepEqual(indexes[0][0], { arr: 1 });
      assert.ok(indexes[0][1].unique);
    });

    it('error should emit on the model', async function() {
      const schema = new Schema({ name: { type: String } });
      const Test = db.model('Test', schema, 'Test');
      await Test.init();
      await Test.create({ name: 'hi' }, { name: 'hi' });

      const Test2 = db.model(
        'Test2',
        new Schema({
          name: {
            type: String,
            unique: true
          }
        }),
        'Test'
      );

      const err = await Test2.init().then(() => null, err => err);
      assert.ok(/E11000 duplicate key error/.test(err.message), err);
    });

    it('when one index creation errors', async function() {
      const userSchema = {
        name: { type: String },
        secondValue: { type: Boolean }
      };

      const userSchema1 = new Schema(userSchema);
      userSchema1.index({ name: 1 });

      const userSchema2 = new Schema(userSchema);
      userSchema2.index({ name: 1 }, { unique: true });
      userSchema2.index({ secondValue: 1 });

      const collectionName = 'deepindexedmodel' + random();
      // Create model with first schema to initialize indexes
      db.model('SingleIndexedModel', userSchema1, collectionName);

      // Create model with second schema in same collection to add new indexes
      const UserModel2 = db.model('DuplicateIndexedModel', userSchema2, collectionName);
      let assertions = 0;

      await UserModel2.init().catch(err => err);

      const rawIndexesResponse = await UserModel2.collection.getIndexes();
      const indexesNames = Object.values(rawIndexesResponse).map(indexArray => indexArray[0][0]);

      for (const indexName of indexesNames) {
        if (indexName === 'name') {
          assertions++;
        }
        if (indexName === 'secondValue') {
          assertions++;
        }
      }

      assert.equal(assertions, 2);
    });

    it('creates descending indexes from schema definition(gh-8895)', async function() {

      const userSchema = new Schema({
        name: { type: String, index: -1 },
        address: { type: String, index: '-1' }
      });

      const User = db.model('User', userSchema);

      await User.init();

      const indexes = await User.collection.getIndexes();

      assert.ok(indexes['name_-1']);
      assert.ok(indexes['address_-1']);
    });

    describe('auto creation', function() {
      it('can be disabled', async function() {
        const schema = new Schema({ name: { type: String, index: true } });
        schema.set('autoIndex', false);

        const Test = db.model('Test', schema);
        Test.on('index', function() {
          assert.ok(false, 'Model.ensureIndexes() was called');
        });

        // Create a doc because mongodb 3.0 getIndexes errors if db doesn't
        // exist
        await Test.create({ name: 'Bacon' });
        await new Promise((resolve) => setTimeout(resolve, 100));

        const indexes = await Test.collection.getIndexes();

        // Only default _id index should exist
        assert.deepEqual(['_id_'], Object.keys(indexes));
      });

      describe('global autoIndexes (gh-1875)', function() {
        beforeEach(() => db.deleteModel(/Test/));

        it('will create indexes as a default', async function() {
          const schema = new Schema({ name: { type: String, index: true } });
          const Test = db.model('Test', schema);
          await Test.init();

          assert.ok(true, 'Model.ensureIndexes() was called');
          const indexes = await Test.collection.getIndexes();

          assert.equal(Object.keys(indexes).length, 2);
        });

        it('will not create indexes if the global auto index is false and schema option isnt set (gh-1875)', async function() {
          const db = start({ config: { autoIndex: false } });
          const schema = new Schema({ name: { type: String, index: true } });
          const Test = db.model('Test', schema);
          Test.on('index', function() {
            assert.ok(false, 'Model.ensureIndexes() was called');
          });

          await Test.create({ name: 'Bacon' });
          await new Promise((resolve) => setTimeout(resolve, 100));

          const indexes = await Test.collection.getIndexes();
          assert.deepEqual(['_id_'], Object.keys(indexes));

          await db.close();
        });
      });
    });

    describe.skip('model.ensureIndexes()', function() {
      it('is a function', function() {
        const schema = mongoose.Schema({ x: 'string' });
        const Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        assert.equal(typeof Test.ensureIndexes, 'function');
      });

      it('returns a Promise', function() {
        const schema = mongoose.Schema({ x: 'string' });
        const Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        const p = Test.ensureIndexes();
        assert.ok(p instanceof Promise);
      });

      it('creates indexes', async function() {
        const schema = new Schema({ name: { type: String } });
        const Test = db.model('ManualIndexing' + random(), schema, 'x' + random());

        Test.schema.index({ name: 1 }, { sparse: true });

        let called = false;
        Test.on('index', function() {
          called = true;
        });

        await Test.ensureIndexes();

        assert.ok(called);
      });
    });
  });

  it('sets correct partialFilterExpression for document array (gh-9091)', async function() {
    const childSchema = new Schema({ name: String });
    childSchema.index({ name: 1 }, { partialFilterExpression: { name: { $exists: true } } });
    const schema = new Schema({ arr: [childSchema] });
    const Model = db.model('Test', schema);


    await Model.init();

    await Model.syncIndexes();
    const indexes = await Model.listIndexes();

    assert.equal(indexes.length, 2);
    assert.ok(indexes[1].partialFilterExpression);
    assert.deepEqual(indexes[1].partialFilterExpression, {
      'arr.name': { $exists: true }
    });
  });

  it('skips automatic indexing on childSchema if autoIndex: false (gh-9150)', async function() {
    const nestedSchema = mongoose.Schema({
      name: { type: String, index: true }
    }, { autoIndex: false });

    const schema = mongoose.Schema({
      nested: nestedSchema,
      top: { type: String, index: true }
    });

    const Model = db.model('Model', schema);

    await Model.init();

    const indexes = await Model.listIndexes();

    assert.equal(indexes.length, 2);
    assert.deepEqual(indexes[1].key, { top: 1 });
  });

  describe('discriminators with unique', function() {
    this.timeout(5000);

    it('converts to partial unique index (gh-6347)', async function() {
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
        other: { type: String, index: true }, // Should become a partial
        model: { type: String }
      });

      const Device = Base.discriminator('Device', deviceSchema);

      await Promise.all([
        Base.init(),
        User.init(),
        Device.init(),
        Base.create({}),
        User.create({ emailId: 'val@karpov.io', firstName: 'Val' }),
        Device.create({ name: 'Samsung', model: 'Galaxy' })
      ]);
      const indexes = await Base.listIndexes();
      const index = indexes.find(i => i.key.other);
      assert.deepEqual(index.key, { other: 1 });
      assert.deepEqual(index.partialFilterExpression, { kind: 'Device' });
    });

    it('decorated discriminator index with syncIndexes (gh-6347)', async function() {
      const userSchema = new Schema({}, { discriminatorKey: 'kind', autoIndex: false });

      const User = db.model('User', userSchema);

      const customerSchema = new Schema({
        emailId: { type: String, unique: true }, // Should become a partial
        firstName: { type: String }
      });

      const Customer = User.discriminator('Customer', customerSchema);

      await Customer.init();
      const droppedIndexes = await Customer.syncIndexes();
      assert.equal(droppedIndexes.length, 0);
    });

    it('uses schema-level collation by default (gh-9912)', async function() {

      await db.db.collection('User').drop().catch(() => {});

      const userSchema = new mongoose.Schema({ username: String }, {
        collation: {
          locale: 'en',
          strength: 2
        }
      });
      userSchema.index({ username: 1 }, { unique: true });
      const User = db.model('User', userSchema, 'User');

      await User.init();
      const indexes = await User.listIndexes();
      assert.equal(indexes.length, 2);
      assert.deepEqual(indexes[1].key, { username: 1 });
      assert.ok(indexes[1].collation);
      assert.equal(indexes[1].collation.strength, 2);

      await User.collection.drop();
    });

    it('different collation with syncIndexes() (gh-8521)', async function() {

      await db.db.collection('User').drop().catch(() => {});

      let userSchema = new mongoose.Schema({ username: String });
      userSchema.index({ username: 1 }, { unique: true });
      let User = db.model('User', userSchema, 'User');

      await User.init();
      let indexes = await User.listIndexes();
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

      await User.syncIndexes();

      indexes = await User.listIndexes();
      assert.equal(indexes.length, 2);
      assert.deepEqual(indexes[1].key, { username: 1 });
      assert.ok(!!indexes[1].collation);

      await User.collection.drop();
    });

    it('reports syncIndexes() error (gh-9303)', async function() {

      let userSchema = new mongoose.Schema({ username: String, email: String });
      let User = db.model('User', userSchema);

      await User.createCollection().catch(() => {});
      let indexes = await User.listIndexes();
      assert.equal(indexes.length, 1);

      await User.create([{ username: 'test', email: 'foo@bar' }, { username: 'test', email: 'foo@bar' }]);

      userSchema = new mongoose.Schema({ username: String, email: String }, { autoIndex: false });
      userSchema.index({ username: 1 }, { unique: true });
      userSchema.index({ email: 1 });
      db.deleteModel('User');
      User = db.model('User', userSchema, 'User');

      const err = await User.syncIndexes().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.code, 11000);

      indexes = await User.listIndexes();
      assert.equal(indexes.length, 2);
      assert.deepEqual(indexes[1].key, { email: 1 });

      await User.collection.drop();
    });

    it('should not re-create a compound text index that involves non-text indexes, using syncIndexes (gh-13136)', function(done) {
      const Test = new Schema({
        title: {
          type: String
        },
        description: {
          type: String
        },
        age: {
          type: Number
        }
      }, {
        autoIndex: false
      });

      Test.index({
        title: 'text',
        description: 'text',
        age: 1
      });

      const TestModel = db.model('Test', Test);
      TestModel.syncIndexes().then((results1) => {
        assert.deepEqual(results1, []);
        // second call to syncIndexes should return an empty array, representing 0 deleted indexes
        TestModel.syncIndexes().then((results2) => {
          assert.deepEqual(results2, []);
          done();
        });
      });
    });

    it('should not find a diff when calling diffIndexes after syncIndexes involving a text and non-text compound index (gh-13136)', async function() {
      const Test = new Schema({
        title: {
          type: String
        },
        description: {
          type: String
        },
        age: {
          type: Number
        }
      }, {
        autoIndex: false
      });

      Test.index({
        title: 'text',
        description: 'text',
        age: 1
      });

      const TestModel = db.model('Test', Test);
      await TestModel.init();

      const diff = await TestModel.diffIndexes();
      assert.deepEqual(diff, { toCreate: [{ age: 1, title: 'text', description: 'text' }], toDrop: [] });
      await TestModel.syncIndexes();

      const diff2 = await TestModel.diffIndexes();
      assert.deepEqual(diff2, { toCreate: [], toDrop: [] });
    });

    it('cleanIndexes (gh-6676)', async function() {

      let M = db.model('Test', new Schema({
        name: { type: String, index: true }
      }, { autoIndex: false }), 'Test');

      await M.createIndexes();

      let indexes = await M.listIndexes();
      assert.deepEqual(indexes.map(i => i.key), [
        { _id: 1 },
        { name: 1 }
      ]);

      M = db.model('Test', new Schema({
        name: String
      }, { autoIndex: false }), 'Test');

      await M.cleanIndexes();
      indexes = await M.listIndexes();
      assert.deepEqual(indexes.map(i => i.key), [
        { _id: 1 }
      ]);
    });
    it('should prevent collation on text indexes (gh-10044)', async function() {
      const userSchema = new mongoose.Schema({ username: String }, {
        collation: {
          locale: 'en',
          strength: 2
        },
        autoCreate: false
      });
      userSchema.index({ username: 'text' }, { unique: true });
      const User = db.model('User', userSchema, 'User');

      await User.init();
      const indexes = await User.listIndexes();
      assert.ok(!indexes[1].collation);
      await User.collection.drop();
    });

    it('should do a dryRun feat-10316', async function() {
      const userSchema = new mongoose.Schema({ username: String }, { password: String }, { email: String });
      const User = db.model('Upson', userSchema);
      await User.collection.createIndex({ age: 1 });
      await User.collection.createIndex({ weight: 1 });
      await User.init();
      userSchema.index({ password: 1 });
      userSchema.index({ email: 1 });
      const result = await User.diffIndexes();
      assert.deepStrictEqual(result.toDrop, ['age_1', 'weight_1']);
      assert.deepStrictEqual(result.toCreate, [{ password: 1 }, { email: 1 }]);
    });
  });
});
