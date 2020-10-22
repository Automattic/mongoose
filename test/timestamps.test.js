'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('timestamps', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  // These tests use schemas only, no database connection needed.
  describe('schema options', function() {
    it('should have createdAt and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have createdAt and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', true);

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created',
          updatedAt: 'updated'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });

    it('should have just createdAt if updatedAt set to falsy', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        updatedAt: false
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(!TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created',
        updatedAt: 'updated'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });

    it('TTL index with timestamps (gh-5656)', function() {
      const testSchema = new Schema({
        foo: String,
        updatedAt: {
          type: Date,
          expires: '2h'
        }
      }, { timestamps: true });

      const indexes = testSchema.indexes();
      assert.deepEqual(indexes, [
        [{ updatedAt: 1 }, { background: true, expireAfterSeconds: 7200 }]
      ]);
    });
  });

  it('does not override timestamp params defined in schema (gh-4868)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      createdAt: {
        type: Date,
        select: false
      },
      updatedAt: {
        type: Date,
        select: true
      },
      name: String
    }, { timestamps: true });
    const M = db.model('Test', schema);

    M.create({ name: 'Test' }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('updatedAt without createdAt (gh-5598)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const M = db.model('Test', schema);

    M.create({ name: 'Test' }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('updatedAt without createdAt for nested (gh-5598)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const parentSchema = new mongoose.Schema({
      child: schema
    });
    const M = db.model('Test', parentSchema);

    M.create({ child: { name: 'test' } }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.child.createdAt);
        assert.ok(doc.child.updatedAt);
        assert.ok(doc.child.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('nested paths (gh-4503)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: 'ts.c', updatedAt: 'ts.a' } });
    const M = db.model('Test', schema);

    M.create({ name: 'Test' }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(doc.ts.c);
        assert.ok(doc.ts.c.valueOf() >= startTime);
        assert.ok(doc.ts.a);
        assert.ok(doc.ts.a.valueOf() >= startTime);
        done();
      });
    });
  });

  it('does not override nested timestamp params defined in schema (gh-4868)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      ts: {
        createdAt: {
          type: Date,
          select: false
        },
        updatedAt: {
          type: Date,
          select: true
        }
      },
      name: String
    }, { timestamps: { createdAt: 'ts.createdAt', updatedAt: 'ts.updatedAt' } });
    const M = db.model('Test', schema);

    M.create({ name: 'Test' }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.ts.createdAt);
        assert.ok(doc.ts.updatedAt);
        assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('does not override timestamps in nested schema (gh-4868)', function(done) {
    const startTime = Date.now();
    const tsSchema = new mongoose.Schema({
      createdAt: {
        type: Date,
        select: false
      },
      updatedAt: {
        type: Date,
        select: true
      }
    });
    const schema = new mongoose.Schema({
      ts: tsSchema,
      name: String
    }, { timestamps: { createdAt: 'ts.createdAt', updatedAt: 'ts.updatedAt' } });
    const M = db.model('Test', schema);

    M.create({ name: 'Test' }, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.ts.createdAt);
        assert.ok(doc.ts.updatedAt);
        assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('no timestamps added when parent/child timestamps explicitly false (gh-7202)', function(done) {
    const subSchema = new Schema({}, { timestamps: false });
    const schema = new Schema({ sub: subSchema }, { timestamps: false });

    const Test = db.model('Test', schema);
    const test = new Test({ sub: {} });

    test.save((err, saved) => {
      assert.ifError(err);
      assert.strictEqual(saved.createdAt, undefined);
      assert.strictEqual(saved.updatedAt, undefined);
      assert.strictEqual(saved.sub.createdAt, undefined);
      assert.strictEqual(saved.sub.updatedAt, undefined);
      done();
    });
  });

  it('avoids calling createdAt getters when setting updatedAt (gh-7496)', function() {
    const modelSchema = new Schema({
      createdAt: {
        type: Date,
        get: (date) => date && date.valueOf() / 1000
      },
      updatedAt: {
        type: Date,
        get: (date) => date && date.valueOf() / 1000
      }
    }, { timestamps: true });

    const Model = db.model('Test', modelSchema);

    const start = new Date();
    return Model.create({}).then(doc => {
      assert.ok(doc._doc.createdAt.valueOf() >= start.valueOf());
      assert.ok(doc._doc.updatedAt.valueOf() >= start.valueOf());
    });
  });

  it('handles custom statics that conflict with built-in functions (gh-7698)', function() {
    const schema = new mongoose.Schema({ name: String }, { timestamps: true });

    let called = 0;
    schema.statics.updateOne = function() {
      ++called;
      return mongoose.Model.updateOne.apply(this, arguments);
    };
    const M = db.model('Test', schema);

    const startTime = Date.now();
    return M.deleteMany({}).
      then(() => M.updateOne({}, { name: 'foo' }, { upsert: true })).
      then(() => assert.equal(called, 1)).
      then(() => M.findOne()).
      then(doc => assert.ok(doc.createdAt.valueOf() >= startTime));
  });

  it('timestamps handle reusing child schemas (gh-7712)', function() {
    const childSchema = new mongoose.Schema({ name: String }, {
      timestamps: true
    });
    const M1 = db.model('Test', new mongoose.Schema({ child: childSchema }));
    const M2 = db.model('Test1', new mongoose.Schema({
      children: [childSchema]
    }));

    return co(function*() {
      let startTime = null;
      let doc = yield M1.create({ child: { name: 'foo' } });
      assert.ok(doc.child.updatedAt);
      yield new Promise(resolve => setTimeout(resolve, 25));
      startTime = Date.now();

      doc = yield M1.findOneAndUpdate({}, { $set: { 'child.name': 'bar' } },
        { new: true });
      assert.ok(doc.child.updatedAt.valueOf() >= startTime,
        `Timestamp not updated: ${doc.child.updatedAt}`);

      doc = yield M2.create({ children: [{ name: 'foo' }] });
      assert.ok(doc.children[0].updatedAt);
      yield new Promise(resolve => setTimeout(resolve, 25));
      startTime = Date.now();

      doc = yield M2.findOneAndUpdate({ 'children.name': 'foo' },
        { $set: { 'children.$.name': 'bar' } }, { new: true });
      assert.ok(doc.children[0].updatedAt.valueOf() >= startTime,
        `Timestamp not updated: ${doc.children[0].updatedAt}`);
    });
  });

  it('respects timestamps: false in child schema (gh-8007)', function() {
    const sub = Schema({ name: String }, { timestamps: false, _id: false });
    const schema = Schema({ data: sub });

    const Model = db.model('Test', schema);

    return co(function*() {
      let res = yield Model.create({ data: {} });

      yield Model.bulkWrite([
        {
          updateOne: {
            filter: {
              _id: res._id
            },
            update: {
              'data.name': 'foo'
            }
          }
        }
      ]);

      res = yield Model.findOne({}).lean();
      assert.deepEqual(res.data, { name: 'foo' });
    });
  });

  it('updates updatedAt when calling update without $set (gh-4768)', function() {
    const Model = db.model('Test', Schema({ name: String }, { timestamps: true }));

    return co(function*() {
      let doc = yield Model.create({ name: 'test1' });
      const start = doc.updatedAt;

      yield cb => setTimeout(cb, 50);
      doc = yield Model.findOneAndUpdate({}, doc.toObject(), { new: true });
      assert.ok(doc.updatedAt > start, `${doc.updatedAt} >= ${start}`);
    });
  });

  it('updates updatedAt when calling update on subchild', function() {
    const subchildschema = new mongoose.Schema({
      name: String
    }, { timestamps: true });
    const schema = new mongoose.Schema({
      name: String,
      subchild: subchildschema
    }, { timestamps: true });
    const parentSchema = new mongoose.Schema({
      child: schema
    }, { timestamps: true });

    const Model = db.model('Test', parentSchema);

    return co(function*() {
      let doc = yield Model.create({ name: 'test', child: {
        name: 'child',
        subchild: {
          name: 'subchild'
        }
      } });
      assert.ok(doc.child.updatedAt);
      const startTime = doc.createdAt;
      yield new Promise(resolve => setTimeout(resolve), 25);

      doc = yield Model.findOneAndUpdate({}, { $set: {
        'child.subchild.name': 'subChildUpdated'
      } }, { new: true });

      assert.ok(doc.updatedAt.valueOf() > startTime,
        `Parent Timestamp not updated: ${doc.updatedAt}`);
      assert.ok(doc.child.updatedAt.valueOf() > startTime,
        `Child Timestamp not updated: ${doc.updatedAt}`);
      assert.ok(doc.child.subchild.updatedAt.valueOf() > startTime,
        `SubChild Timestamp not updated: ${doc.updatedAt}`);
    });
  });

  it('sets timestamps on deeply nested docs on upsert (gh-8894)', function() {
    const JournalSchema = Schema({ message: String }, { timestamps: true });
    const ProductSchema = Schema({
      name: String,
      journal: [JournalSchema],
      lastJournal: JournalSchema
    }, { timestamps: true });
    const schema = Schema({ products: [ProductSchema] }, { timestamps: true });
    const Order = db.model('Order', schema);

    const update = {
      products: [{
        name: 'ASUS Vivobook Pro',
        journal: [{ message: 'out of stock' }],
        lastJournal: { message: 'out of stock' }
      }]
    };

    return Order.findOneAndUpdate({}, update, { upsert: true, new: true }).
      then(doc => {
        assert.ok(doc.products[0].journal[0].createdAt);
        assert.ok(doc.products[0].journal[0].updatedAt);

        assert.ok(doc.products[0].lastJournal.createdAt);
        assert.ok(doc.products[0].lastJournal.updatedAt);
      });
  });

  it('sets timestamps on bulk write without `$set` (gh-9268)', function() {
    const NestedSchema = new Schema({ name: String }, {
      timestamps: true,
      _id: false
    });
    const TestSchema = new Schema({
      nestedDoc: NestedSchema
    });
    const Test = db.model('Test', TestSchema);

    return co(function*() {
      yield Test.create({ nestedDoc: { name: 'test' } });
      const doc = yield Test.findOne().lean();

      yield cb => setTimeout(cb, 10);
      yield Test.bulkWrite([
        {
          updateOne: {
            filter: {},
            update: {
              'nestedDoc.name': 'test2'
            }
          }
        }
      ]);

      const newDoc = yield Test.findById(doc).lean();
      assert.ok(newDoc.nestedDoc.updatedAt > doc.nestedDoc.updatedAt);
    });
  });

  it('works with property named "set" (gh-9428)', function() {
    const schema = new Schema({ set: String }, { timestamps: true });
    const Model = db.model('Test', schema);

    return Model.create({ set: 'test' }).then(doc => assert.ok(doc.createdAt));
  });

  it('should not override createdAt when not selected (gh-4340)', function(done) {
    const TestSchema = new Schema({ name: String }, { timestamps: true });

    const Test = db.model('Test', TestSchema);

    Test.create({
      name: 'hello'
    }, function(err, doc) {
      // Let’s save the dates to compare later.
      const createdAt = doc.createdAt;
      const updatedAt = doc.updatedAt;

      assert.ok(doc.createdAt);

      Test.findById(doc._id, { name: true }, function(err, doc) {
        // The dates shouldn’t be selected here.
        assert.ok(!doc.createdAt);
        assert.ok(!doc.updatedAt);

        doc.name = 'world';

        doc.save(function(err, doc) {
          // Let’s save the new updatedAt date as it should have changed.
          const newUpdatedAt = doc.updatedAt;

          assert.ok(!doc.createdAt);
          assert.ok(doc.updatedAt);

          Test.findById(doc._id, function(err, doc) {
            // Let’s make sure that everything is working again by
            // comparing the dates with the ones we saved.
            assert.equal(doc.createdAt.valueOf(), createdAt.valueOf());
            assert.notEqual(doc.updatedAt.valueOf(), updatedAt.valueOf());
            assert.equal(doc.updatedAt.valueOf(), newUpdatedAt.valueOf());

            done();
          });
        });
      });
    });
  });

  describe('auto update createdAt and updatedAt when create/save/update document', function() {
    let CatSchema;
    let Cat;

    before(function() {
      CatSchema = new Schema({
        name: String,
        hobby: String
      }, { timestamps: true });
      Cat = db.model('Cat', CatSchema);
      return Cat.deleteMany({}).then(() => Cat.create({ name: 'newcat' }));
    });

    it('should have fields when create', function(done) {
      const cat = new Cat({ name: 'newcat' });
      cat.save(function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should have fields when create with findOneAndUpdate', function(done) {
      Cat.findOneAndUpdate({ name: 'notexistname' }, { $set: {} }, { upsert: true, new: true }, function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should change updatedAt when save', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;

        doc.hobby = 'coding';

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should not change updatedAt when save with no modifications', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() === old.getTime());
          done();
        });
      });
    });

    it('can skip with timestamps: false (gh-7357)', function() {
      return co(function*() {
        const cat = yield Cat.findOne();

        const old = cat.updatedAt;

        yield cb => setTimeout(() => cb(), 10);

        cat.hobby = 'fishing';

        yield cat.save({ timestamps: false });

        assert.strictEqual(cat.updatedAt, old);
      });
    });

    it('should change updatedAt when findOneAndUpdate', function(done) {
      Cat.create({ name: 'test123' }, function(err) {
        assert.ifError(err);
        Cat.findOne({ name: 'test123' }, function(err, doc) {
          const old = doc.updatedAt;
          Cat.findOneAndUpdate({ name: 'test123' }, { $set: { hobby: 'fish' } }, { new: true }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('insertMany with createdAt off (gh-6381)', function() {
      const CatSchema = new Schema({
        name: String,
        createdAt: {
          type: Date,
          default: function() {
            return new Date('2013-06-01');
          }
        }
      },
      {
        timestamps: {
          createdAt: false,
          updatedAt: true
        }
      });

      const Cat = db.model('Test', CatSchema);

      const d = new Date('2011-06-01');

      return co(function*() {
        yield Cat.deleteMany({});
        yield Cat.insertMany([{ name: 'a' }, { name: 'b', createdAt: d }]);

        const cats = yield Cat.find().sort('name');

        assert.equal(cats[0].createdAt.valueOf(), new Date('2013-06-01').valueOf());
        assert.equal(cats[1].createdAt.valueOf(), new Date('2011-06-01').valueOf());
      });
    });

    it('should have fields when update', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.update({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('should change updatedAt when updateOne', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.updateOne({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('should change updatedAt when updateMany', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.updateMany({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('nested docs (gh-4049)', function(done) {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      const Group = db.model('Test', GroupSchema);
      const now = Date.now();
      Group.create({ cats: [{ name: 'Garfield' }] }, function(error, group) {
        assert.ifError(error);
        assert.ok(group.cats[0].createdAt);
        assert.ok(group.cats[0].createdAt.getTime() >= now);
        done();
      });
    });

    it('nested docs with push (gh-4049)', function(done) {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      const Group = db.model('Test', GroupSchema);
      const now = Date.now();
      Group.create({ cats: [{ name: 'Garfield' }] }, function(error, group) {
        assert.ifError(error);
        group.cats.push({ name: 'Keanu' });
        group.save(function(error) {
          assert.ifError(error);
          Group.findById(group._id, function(error, group) {
            assert.ifError(error);
            assert.ok(group.cats[1].createdAt);
            assert.ok(group.cats[1].createdAt.getTime() > now);
            done();
          });
        });
      });
    });

    after(function() {
      return Cat.deleteMany({});
    });
  });

  it('timestamps with number types (gh-3957)', function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, { timestamps: true });
    const Model = db.model('Test', schema);
    const start = Date.now();

    return co(function*() {
      const doc = yield Model.create({ name: 'test' });

      assert.equal(typeof doc.createdAt, 'number');
      assert.equal(typeof doc.updatedAt, 'number');
      assert.ok(doc.createdAt >= start);
      assert.ok(doc.updatedAt >= start);
    });
  });

  it('timestamps with custom timestamp (gh-3957)', function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, {
      timestamps: { currentTime: () => 42 }
    });
    const Model = db.model('Test', schema);

    return co(function*() {
      const doc = yield Model.create({ name: 'test' });

      assert.equal(typeof doc.createdAt, 'number');
      assert.equal(typeof doc.updatedAt, 'number');
      assert.equal(doc.createdAt, 42);
      assert.equal(doc.updatedAt, 42);
    });
  });

  it('shouldnt bump updatedAt in single nested subdocs that are not modified (gh-9357)', function() {
    const nestedSchema = Schema({
      nestedA: { type: String },
      nestedB: { type: String }
    }, { timestamps: true });
    const parentSchema = Schema({
      content: {
        a: nestedSchema,
        b: nestedSchema,
        c: String
      }
    });

    const Parent = db.model('Test', parentSchema);

    return co(function*() {
      yield Parent.deleteMany({});

      yield Parent.create({
        content: {
          a: { nestedA: 'a' },
          b: { nestedB: 'b' }
        }
      });

      const doc = yield Parent.findOne();

      const ts = doc.content.b.updatedAt;
      doc.content.a.nestedA = 'b';
      yield cb => setTimeout(cb, 10);
      yield doc.save();

      const fromDb = yield Parent.findById(doc);
      assert.strictEqual(fromDb.content.b.updatedAt.valueOf(), ts.valueOf());
    });
  });

  it('bumps updatedAt with mixed $set (gh-9357)', function() {
    const nestedSchema = Schema({
      nestedA: { type: String },
      nestedB: { type: String }
    }, { timestamps: true });
    const parentSchema = Schema({
      content: {
        a: nestedSchema,
        b: nestedSchema,
        c: String
      }
    });

    const Parent = db.model('Test', parentSchema);

    return co(function*() {
      yield Parent.deleteMany({});

      const doc = yield Parent.create({
        content: {
          a: { nestedA: 'a' },
          b: { nestedB: 'b' }
        }
      });
      const ts = doc.content.b.updatedAt;

      yield cb => setTimeout(cb, 10);
      const fromDb = yield Parent.findOneAndUpdate({}, {
        'content.c': 'value',
        $set: {
          'content.a.nestedA': 'value'
        }
      }, { new: true });

      assert.ok(fromDb.content.a.updatedAt.valueOf() > ts.valueOf());
    });
  });
});
