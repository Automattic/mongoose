'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('timestamps', function() {
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

  // These tests use schemas only, no database connection needed.
  describe('schema options', function() {
    it('should have createdAt and updatedAt fields', function() {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));

    });

    it('should have createdAt and updatedAt fields', function() {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', true);

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));

    });

    it('should have created and updatedAt fields', function() {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));

    });

    it('should have created and updatedAt fields', function() {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));

    });

    it('should have created and updated fields', function() {
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

    });

    it('should have just createdAt if updatedAt set to falsy', function() {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        updatedAt: false
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(!TestSchema.path('updatedAt'));

    });

    it('should have created and updated fields', function() {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created',
        updatedAt: 'updated'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));

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

  it('does not override timestamp params defined in schema (gh-4868)', async function() {
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

    let doc = await M.create({ name: 'Test' });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(!doc.createdAt);
    assert.ok(doc.updatedAt);
    assert.ok(doc.updatedAt.valueOf() >= startTime);
  });

  it('updatedAt without createdAt (gh-5598)', async function() {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const M = db.model('Test', schema);

    let doc = await M.create({ name: 'Test' });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(!doc.createdAt);
    assert.ok(doc.updatedAt);
    assert.ok(doc.updatedAt.valueOf() >= startTime);
  });

  it('updatedAt without createdAt for nested (gh-5598)', async function() {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const parentSchema = new mongoose.Schema({
      child: schema
    });
    const M = db.model('Test', parentSchema);

    let doc = await M.create({ child: { name: 'test' } });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(!doc.child.createdAt);
    assert.ok(doc.child.updatedAt);
    assert.ok(doc.child.updatedAt.valueOf() >= startTime);

  });

  it('nested paths (gh-4503)', async function() {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: 'ts.c', updatedAt: 'ts.a' } });
    const M = db.model('Test', schema);

    let doc = await M.create({ name: 'Test' });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(doc.ts.c);
    assert.ok(doc.ts.c.valueOf() >= startTime);
    assert.ok(doc.ts.a);
    assert.ok(doc.ts.a.valueOf() >= startTime);

  });

  it('does not override nested timestamp params defined in schema (gh-4868)', async function() {
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

    let doc = await M.create({ name: 'Test' });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(!doc.ts.createdAt);
    assert.ok(doc.ts.updatedAt);
    assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
  });

  it('does not override timestamps in nested schema (gh-4868)', async function() {
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

    let doc = await M.create({ name: 'Test' });
    doc = await M.findOne({ _id: doc._id });
    assert.ok(!doc.ts.createdAt);
    assert.ok(doc.ts.updatedAt);
    assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
  });

  it('no timestamps added when parent/child timestamps explicitly false (gh-7202)', async function() {
    const subSchema = new Schema({}, { timestamps: false });
    const schema = new Schema({ sub: subSchema }, { timestamps: false });

    const Test = db.model('Test', schema);
    const test = new Test({ sub: {} });

    const saved = await test.save();
    assert.strictEqual(saved.createdAt, undefined);
    assert.strictEqual(saved.updatedAt, undefined);
    assert.strictEqual(saved.sub.createdAt, undefined);
    assert.strictEqual(saved.sub.updatedAt, undefined);
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

  it('timestamps handle reusing child schemas (gh-7712)', async function() {
    const childSchema = new mongoose.Schema({ name: String }, {
      timestamps: true
    });
    const M1 = db.model('Test', new mongoose.Schema({ child: childSchema }));
    const M2 = db.model('Test1', new mongoose.Schema({
      children: [childSchema]
    }));

    let startTime = null;
    let doc = await M1.create({ child: { name: 'foo' } });
    assert.ok(doc.child.updatedAt);
    await new Promise(resolve => setTimeout(resolve, 25));
    startTime = Date.now();

    doc = await M1.findOneAndUpdate({}, { $set: { 'child.name': 'bar' } },
      { new: true });
    assert.ok(doc.child.updatedAt.valueOf() >= startTime,
      `Timestamp not updated: ${doc.child.updatedAt}`);

    doc = await M2.create({ children: [{ name: 'foo' }] });
    assert.ok(doc.children[0].updatedAt);
    await new Promise(resolve => setTimeout(resolve, 25));
    startTime = Date.now();

    doc = await M2.findOneAndUpdate({ 'children.name': 'foo' },
      { $set: { 'children.$.name': 'bar' } }, { new: true });
    assert.ok(doc.children[0].updatedAt.valueOf() >= startTime,
      `Timestamp not updated: ${doc.children[0].updatedAt}`);
  });

  it('respects timestamps: false in child schema (gh-8007)', async function() {
    const sub = Schema({ name: String }, { timestamps: false, _id: false });
    const schema = Schema({ data: sub });

    const Model = db.model('Test', schema);

    let res = await Model.create({ data: {} });

    await Model.bulkWrite([
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

    res = await Model.findOne({}).lean();
    assert.deepEqual(res.data, { name: 'foo' });
  });

  it('updates updatedAt when calling update without $set (gh-4768)', async function() {
    const Model = db.model('Test', Schema({ name: String }, { timestamps: true }));

    let doc = await Model.create({ name: 'test1' });
    const start = doc.updatedAt;

    await delay(50);
    doc = await Model.findOneAndUpdate({}, doc.toObject(), { new: true });
    assert.ok(doc.updatedAt > start, `${doc.updatedAt} >= ${start}`);
  });

  it('updates updatedAt when calling update on subchild', async function() {
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

    let doc = await Model.create({ name: 'test', child: {
      name: 'child',
      subchild: {
        name: 'subchild'
      }
    } });
    assert.ok(doc.child.updatedAt);
    const startTime = doc.createdAt;
    await new Promise(resolve => setTimeout(resolve), 25);

    doc = await Model.findOneAndUpdate({}, { $set: {
      'child.subchild.name': 'subChildUpdated'
    } }, { new: true });

    assert.ok(doc.updatedAt.valueOf() > startTime,
      `Parent Timestamp not updated: ${doc.updatedAt}`);
    assert.ok(doc.child.updatedAt.valueOf() > startTime,
      `Child Timestamp not updated: ${doc.updatedAt}`);
    assert.ok(doc.child.subchild.updatedAt.valueOf() > startTime,
      `SubChild Timestamp not updated: ${doc.updatedAt}`);
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

  it('sets timestamps on bulk write without `$set` (gh-9268)', async function() {
    const NestedSchema = new Schema({ name: String }, {
      timestamps: true,
      _id: false
    });
    const TestSchema = new Schema({
      nestedDoc: NestedSchema
    });
    const Test = db.model('Test', TestSchema);

    await Test.create({ nestedDoc: { name: 'test' } });
    const doc = await Test.findOne().lean();

    await delay(10);
    await Test.bulkWrite([
      {
        updateOne: {
          filter: {},
          update: {
            'nestedDoc.name': 'test2'
          }
        }
      }
    ]);

    const newDoc = await Test.findById(doc).lean();
    assert.ok(newDoc.nestedDoc.updatedAt > doc.nestedDoc.updatedAt);
  });

  it('works with property named "set" (gh-9428)', function() {
    const schema = new Schema({ set: String }, { timestamps: true });
    const Model = db.model('Test', schema);

    return Model.create({ set: 'test' }).then(doc => assert.ok(doc.createdAt));
  });

  it('should not override createdAt when not selected (gh-4340)', async function() {
    const TestSchema = new Schema({ name: String }, { timestamps: true });

    const Test = db.model('Test', TestSchema);

    let doc = await Test.create({
      name: 'hello'
    });
    // Let’s save the dates to compare later.
    const createdAt = doc.createdAt;
    const updatedAt = doc.updatedAt;

    assert.ok(doc.createdAt);

    doc = await Test.findById(doc._id, { name: true });
    // The dates shouldn’t be selected here.
    assert.ok(!doc.createdAt);
    assert.ok(!doc.updatedAt);

    doc.name = 'world';

    await doc.save();
    // Let’s save the new updatedAt date as it should have changed.
    const newUpdatedAt = doc.updatedAt;

    assert.ok(!doc.createdAt);
    assert.ok(doc.updatedAt);

    doc = await Test.findById(doc._id);
    // Let’s make sure that everything is working again by
    // comparing the dates with the ones we saved.
    assert.equal(doc.createdAt.valueOf(), createdAt.valueOf());
    assert.notEqual(doc.updatedAt.valueOf(), updatedAt.valueOf());
    assert.equal(doc.updatedAt.valueOf(), newUpdatedAt.valueOf());


  });

  describe('auto update createdAt and updatedAt when create/save/update document', function() {
    let CatSchema;
    let Cat;

    beforeEach(function() {
      CatSchema = new Schema({
        name: String,
        hobby: String
      }, { timestamps: true });
      Cat = db.model('Cat', CatSchema);
      return Cat.deleteMany({}).then(() => Cat.create({ name: 'newcat' }));
    });

    it('should have fields when create', async function() {
      const cat = new Cat({ name: 'newcat' });
      const doc = await cat.save();
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
      assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
    });

    it('sets timestamps on findOneAndUpdate', async function() {
      const doc = await Cat.findOneAndUpdate({ name: 'notexistname' }, { $set: {} }, { upsert: true, new: true });
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
      assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
    });

    it('sets timestamps on findOneAndReplace (gh-9951)', async function() {
      const doc = await Cat.findOneAndReplace({ name: 'notexistname' }, {}, { upsert: true, new: true });
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
      assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
    });

    it('sets timestamps on replaceOne (gh-9951)', async function() {
      await Cat.deleteMany({});
      const { _id } = await Cat.create({ name: 'notexistname' });
      await Cat.replaceOne({ name: 'notexistname' }, {});
      const docs = await Cat.find({});
      assert.equal(docs.length, 1);
      const [doc] = docs;
      assert.equal(doc._id.toHexString(), _id.toHexString());
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);
      assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
    });

    it('should change updatedAt when save', async function() {
      const doc = await Cat.findOne({ name: 'newcat' });
      const old = doc.updatedAt;

      doc.hobby = 'coding';

      await doc.save();
      assert.ok(doc.updatedAt.getTime() > old.getTime());
    });

    it('should not change updatedAt when save with no modifications', async function() {
      const doc = await Cat.findOne({ name: 'newcat' });
      const old = doc.updatedAt;

      await doc.save();
      assert.ok(doc.updatedAt.getTime() === old.getTime());
    });

    it('can skip with timestamps: false (gh-7357)', async function() {
      const cat = await Cat.findOne();

      const old = cat.updatedAt;

      await delay(10);

      cat.hobby = 'fishing';

      await cat.save({ timestamps: false });

      assert.strictEqual(cat.updatedAt, old);
    });

    it('can skip with `$timestamps(false)` (gh-12117)', async function() {
      const cat = await Cat.findOne();
      const old = cat.updatedAt;

      await delay(10);

      cat.hobby = 'fishing';

      cat.$timestamps(false);
      await cat.save();

      assert.strictEqual(cat.updatedAt, old);
    });

    it('should change updatedAt when findOneAndUpdate', async function() {
      await Cat.create({ name: 'test123' });
      let doc = await Cat.findOne({ name: 'test123' });
      const old = doc.updatedAt;
      doc = await Cat.findOneAndUpdate({ name: 'test123' }, { $set: { hobby: 'fish' } }, { new: true });
      assert.ok(doc.updatedAt.getTime() > old.getTime());

    });

    it('insertMany with createdAt off (gh-6381)', async function() {
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

      await Cat.deleteMany({});
      await Cat.insertMany([{ name: 'a' }, { name: 'b', createdAt: d }]);

      const cats = await Cat.find().sort('name');

      assert.equal(cats[0].createdAt.valueOf(), new Date('2013-06-01').valueOf());
      assert.equal(cats[1].createdAt.valueOf(), new Date('2011-06-01').valueOf());
    });

    it('should have fields when updateOne', async function() {
      let doc = await Cat.findOne({ name: 'newcat' });
      const old = doc.updatedAt;
      await Cat.updateOne({ name: 'newcat' }, { $set: { hobby: 'fish' } });
      doc = await Cat.findOne({ name: 'newcat' });
      assert.ok(doc.updatedAt.getTime() > old.getTime());

    });

    it('should change updatedAt when updateOne', async function() {
      let doc = await Cat.findOne({ name: 'newcat' });
      const old = doc.updatedAt;
      await Cat.updateOne({ name: 'newcat' }, { $set: { hobby: 'fish' } });
      doc = await Cat.findOne({ name: 'newcat' });
      assert.ok(doc.updatedAt.getTime() > old.getTime());

    });

    it('should change updatedAt when updateMany', async function() {
      let doc = await Cat.findOne({ name: 'newcat' });
      const old = doc.updatedAt;
      await Cat.updateMany({ name: 'newcat' }, { $set: { hobby: 'fish' } });
      doc = await Cat.findOne({ name: 'newcat' });
      assert.ok(doc.updatedAt.getTime() > old.getTime());

    });

    it('nested docs (gh-4049)', async function() {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      const Group = db.model('Test', GroupSchema);
      const now = Date.now();
      const group = await Group.create({ cats: [{ name: 'Garfield' }] });
      assert.ok(group.cats[0].createdAt);
      assert.ok(group.cats[0].createdAt.getTime() >= now);
    });

    it('nested docs with push (gh-4049)', async function() {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      const Group = db.model('Test', GroupSchema);
      const now = Date.now();
      let group = await Group.create({ cats: [{ name: 'Garfield' }] });
      group.cats.push({ name: 'Keanu' });
      await group.save();
      group = await Group.findById(group._id);
      assert.ok(group.cats[1].createdAt);
      assert.ok(group.cats[1].createdAt.getTime() > now);

    });
  });

  it('timestamps with number types (gh-3957)', async function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, { timestamps: true });
    const Model = db.model('Test', schema);
    const start = Date.now();

    const doc = await Model.create({ name: 'test' });

    assert.equal(typeof doc.createdAt, 'number');
    assert.equal(typeof doc.updatedAt, 'number');
    assert.ok(doc.createdAt >= start);
    assert.ok(doc.updatedAt >= start);
  });

  it('timestamps with custom timestamp (gh-3957)', async function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, {
      timestamps: { currentTime: () => 42 }
    });
    const Model = db.model('Test', schema);

    const doc = await Model.create({ name: 'test' });

    assert.equal(typeof doc.createdAt, 'number');
    assert.equal(typeof doc.updatedAt, 'number');
    assert.equal(doc.createdAt, 42);
    assert.equal(doc.updatedAt, 42);
  });

  it('timestamps with custom timestamp using getter method (gh-3957)', async function() {
    const now = Date.now();
    const schema = Schema({
      createdAt: {
        type: Schema.Types.Number,
        get: (createdAt) => new Date(createdAt * 1000)
      },
      updatedAt: {
        type: Schema.Types.Number,
        get: (updatedAt) => new Date(updatedAt * 1000)
      },
      name: String
    }, {
      timestamps: { currentTime: () => Math.floor(now / 1000) }
    });
    const Model = db.model('Test', schema);
    const doc = await Model.create({ name: 'test' });

    assert.equal(typeof doc.createdAt, 'object');
    assert.equal(typeof doc.updatedAt, 'object');
    assert.equal(Math.floor(doc.createdAt.getTime() / 1000), Math.floor(now / 1000));
    assert.equal(Math.floor(doc.updatedAt.getTime() / 1000), Math.floor(now / 1000));
  });

  it('shouldnt bump updatedAt in single nested subdocs that are not modified (gh-9357)', async function() {
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

    await Parent.deleteMany({});

    const _id = await Parent.create({
      content: {
        a: { nestedA: 'a' },
        b: { nestedB: 'b' }
      }
    }).then(doc => doc._id);

    const doc = await Parent.findById(_id);

    const ts = doc.content.b.updatedAt;
    doc.content.a.nestedA = 'b';
    await delay(10);
    await doc.save();

    const fromDb = await Parent.findById(_id);
    assert.strictEqual(fromDb.content.b.updatedAt.valueOf(), ts.valueOf());
  });

  it('bumps updatedAt with mixed $set (gh-9357)', async function() {
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

    await Parent.deleteMany({});

    const doc = await Parent.create({
      content: {
        a: { nestedA: 'a' },
        b: { nestedB: 'b' }
      }
    });
    const ts = doc.content.b.updatedAt;

    await delay(10);
    const fromDb = await Parent.findOneAndUpdate({}, {
      'content.c': 'value',
      $set: {
        'content.a.nestedA': 'value'
      }
    }, { new: true });

    assert.ok(fromDb.content.a.updatedAt.valueOf() > ts.valueOf());
  });

  it('makes createdAt immutable by default (gh-10139)', async function() {
    const schema = Schema({ name: String }, { timestamps: true });
    const Model = db.model('Time', schema);
    const doc = await Model.create({ name: 'test' });
    const test = doc.createdAt;
    doc.createdAt = new Date();
    assert.equal(test, doc.createdAt);
  });

  it('sets createdAt when using $push/$addToSet on path with positional operator (gh-10447)', async function() {
    const userSchema = new Schema({
      email: String
    }, { timestamps: true });
    const eventSchema = new Schema({
      users: [userSchema],
      message: String
    }, { timestamps: true });

    const churchSchema = new Schema({
      events: [eventSchema]
    }, { timestamps: true });

    const Church = db.model('Test', churchSchema);

    await Church.create({
      events: [{
        churchId: 1,
        message: 'test',
        users: [{
          churchId: 1,
          email: 'test@google.com'
        }]
      }]
    });

    const church = await Church.findOneAndUpdate({
      events: { $elemMatch: { users: { $not: { $elemMatch: { email: 'test2@google.com' } } } } }
    }, {
      $addToSet: {
        'events.$.users': { churchId: 1, email: 'test2@google.com' }
      }
    }, {
      new: true
    });

    assert.equal(church.events.length, 1);
    assert.equal(church.events[0].users.length, 2);
    assert.equal(church.events[0].users[1].email, 'test2@google.com');
    assert.ok(church.events[0].users[1].createdAt);
  });

  it('sets createdAt when creating new single nested subdoc (gh-11603)', async function() {
    const childSchema = new mongoose.Schema(
      { name: String },
      { timestamps: { createdAt: 'created', updatedAt: false }, _id: false }
    );

    const testSchema = new mongoose.Schema({ child: childSchema, age: Number });

    const Test = db.model('Test', testSchema);

    await Test.create({ age: 10 });
    await Test.findOneAndUpdate(
      { child: { $exists: false } },
      { $set: { child: { name: 'Update Creation' } } }
    );

    let updatedParent = await Test.findOne({ age: 10 });
    assert.ok(updatedParent.child.created instanceof Date);

    await Test.create({ age: 12 });
    const parentToChange = await Test.findOne({ child: { $exists: false } });

    parentToChange.child = { name: 'Save Creation' };
    await parentToChange.save();

    updatedParent = await Test.findOne({ age: 12 });
    assert.ok(updatedParent.child.created instanceof Date);
    const date = updatedParent.child.created;

    updatedParent.child.name = 'test update';
    await updatedParent.save();

    updatedParent = await Test.findOne({ age: 12 });
    assert.ok(updatedParent.child.created instanceof Date);
    assert.strictEqual(updatedParent.child.created.valueOf(), date.valueOf());
  });

  it('sets timestamps on sub-schema if parent schema does not have timestamps: true (gh-12119)', async function() {
    // `timestamps` option set to true on deepest sub document
    const ConditionSchema = new mongoose.Schema({
      kind: String,
      amount: Number
    }, { timestamps: true });

    // no `timestamps` option defined
    const ProfileSchema = new mongoose.Schema({
      conditions: [ConditionSchema]
    });

    const UserSchema = new mongoose.Schema({
      name: String,
      profile: {
        type: ProfileSchema
      }
    }, { timestamps: true });

    const User = db.model('User', UserSchema);

    const res = await User.findOneAndUpdate(
      { name: 'test' },
      { $set: { profile: { conditions: [{ kind: 'price', amount: 10 }] } } },
      { upsert: true, returnDocument: 'after' }
    );

    assert.ok(res.profile.conditions[0].createdAt);
    assert.ok(res.profile.conditions[0].updatedAt);
  });

  it('works with insertMany() and embedded discriminators (gh-12150)', async function() {
    const AssetSchema = new Schema({ url: String, size: String }, { timestamps: true });
    const HeaderSectionSchema = new Schema({
      title: String,
      image: AssetSchema
    });

    // Abstract section
    const BaseSectionSchema = new Schema({
      isVisible: Boolean
    }, { discriminatorKey: 'kind' });

    // Main Schema
    const PageSchema = new Schema({
      sections: [BaseSectionSchema] // Same error without the array "sections: BaseSectionSchema"
    }, { timestamps: true });

    const sections = PageSchema.path('sections');
    sections.discriminator('header', HeaderSectionSchema);

    const Test = db.model('Test', PageSchema);

    await Test.insertMany([{
      sections: {
        isVisible: true,
        kind: 'header',
        title: 'h1'
      }
    }]);

    const doc = await Test.findOne();
    assert.equal(doc.sections.length, 1);
    assert.equal(doc.sections[0].title, 'h1');
  });

  it('findOneAndUpdate creates subdocuments with timestamps in correct order (gh-12475)', async function() {
    const testSchema = new Schema(
      {
        uuid: String,
        addresses: [new Schema({ location: String }, { timestamps: true })]
      },
      { timestamps: true }
    );

    const Test = db.model('Test', testSchema);

    const item = new Test({ uuid: '123', addresses: [{ location: 'earth' }] });
    await item.save();

    const newItem = await Test.findOneAndUpdate({ uuid: '123' }, {
      uuid: '456', $push: { addresses: { location: 'earth' } }
    }, { upsert: true, new: true, runValidators: true });

    for (const address of newItem.addresses) {
      const keys = Object.keys(address.toObject());
      assert.deepStrictEqual(keys, ['location', '_id', 'createdAt', 'updatedAt']);
    }
  });
  it('should avoid setting null update when updating document with timestamps gh-13379', async function() {

    const subWithTimestampSchema = new Schema({
      subName: {
        type: String,
        default: 'anonymous',
        required: true
      }
    });

    subWithTimestampSchema.set('timestamps', true);

    const testSchema = new Schema({
      name: String,
      sub: { type: subWithTimestampSchema }
    });

    const Test = db.model('gh13379', testSchema);

    const doc = new Test({
      name: 'Test Testerson',
      sub: { subName: 'John' }
    });
    await doc.save();
    await Test.updateMany({}, [{ $set: { updateCounter: 1 } }]);
    // oddly enough, the null property is not accessible. Doing check.null doesn't return anything even though
    // if you were to console.log() the output of a findOne you would be able to see it. This is the workaround.
    const test = await Test.countDocuments({ null: { $exists: true } });
    assert.equal(test, 0);
    // now we need to make sure that the solution didn't prevent the updateCounter addition
    const check = await Test.findOne();
    assert(check.toString().includes('updateCounter: 1'));
  });
});

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
