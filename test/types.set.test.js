'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const SchemaSetOptions = require('../lib/options/schemaSetOptions');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('Set', function() {
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

  it('casts values and removes duplicates', function() {
    const schema = new Schema({
      tags: { type: Set, of: String },
      nums: { type: Set, of: Number },
      ids: { type: Set, of: 'ObjectId' },
      any: Set
    });
    assert.ok(schema.path('tags') instanceof Schema.Types.Set);
    assert.ok(schema.path('tags').options instanceof SchemaSetOptions);
    assert.ok(schema.path('tags').getEmbeddedSchemaType() instanceof Schema.Types.String);
    assert.ok(schema.path('any').getEmbeddedSchemaType() instanceof Schema.Types.Mixed);

    const Test = db.model('Test', schema);
    const id = new mongoose.Types.ObjectId();
    const doc = new Test({
      tags: ['a', 'b', 'a'],
      nums: new Set(['1', 2, '2']),
      ids: [id, id.toHexString()],
      any: 'test'
    });

    assert.ok(doc.tags instanceof Set);
    assert.ok(doc.tags instanceof mongoose.Types.Set);
    assert.ok(doc.tags.$isMongooseSet);
    assert.deepStrictEqual(Array.from(doc.tags), ['a', 'b']);
    assert.deepStrictEqual(Array.from(doc.nums), [1, 2]);
    assert.equal(doc.ids.size, 1);
    assert.ok(doc.ids.has(id.toHexString()));
    assert.ok(doc.nums.has('1'));
    assert.ok(!doc.nums.has('not a number'));
    assert.deepStrictEqual(Array.from(doc.any), ['test']);

    doc.ids.add(id.toHexString());
    assert.equal(doc.ids.size, 1);

    doc.nums.add('not a number');
    assert.ok(doc.validateSync().errors['nums']);
    assert.deepStrictEqual(Array.from(doc.nums), [1, 2]);
  });

  it('throws a cast error if any value fails to cast', function() {
    const Test = db.model('Test', new Schema({ nums: { type: Set, of: Number } }));

    const doc = new Test({ nums: [1, 'fail'] });
    const err = doc.validateSync();
    assert.ok(err.errors['nums'] instanceof mongoose.Error.CastError);
    assert.equal(err.errors['nums'].kind, 'Set');
  });

  it('stores sets as arrays and hydrates them as sets', async function() {
    const Test = db.model('Test', new Schema({ tags: { type: Set, of: String } }));

    const { _id } = await Test.create({ tags: ['a', 'b', 'a'] });

    const raw = await Test.collection.findOne({ _id });
    assert.deepStrictEqual(raw.tags, ['a', 'b']);

    const doc = await Test.findById(_id);
    assert.ok(doc.tags instanceof mongoose.Types.Set);
    assert.deepStrictEqual(Array.from(doc.tags), ['a', 'b']);
    assert.ok(!doc.isModified('tags'));

    const lean = await Test.findById(_id).lean();
    assert.deepStrictEqual(lean.tags, ['a', 'b']);
  });

  it('tracks changes from add(), delete(), and clear()', async function() {
    const Test = db.model('Test', new Schema({ tags: { type: Set, of: String } }));

    const { _id } = await Test.create({ tags: ['a', 'b'] });
    const doc = await Test.findById(_id);

    doc.tags.add('a');
    assert.ok(!doc.isModified('tags'));
    assert.strictEqual(doc.tags.delete('c'), false);
    assert.ok(!doc.isModified('tags'));

    doc.tags.add('c');
    assert.ok(doc.isModified('tags'));
    await doc.save();
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).tags, ['a', 'b', 'c']);

    assert.strictEqual(doc.tags.delete('a'), true);
    assert.ok(doc.isModified('tags'));
    await doc.save();
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).tags, ['b', 'c']);

    doc.tags.clear();
    assert.ok(doc.isModified('tags'));
    await doc.save();
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).tags, []);

    doc.tags = ['x'];
    await doc.save();
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).tags, ['x']);

    doc.tags = new Set(['x']);
    assert.ok(!doc.isModified('tags'));
  });

  it('runs validators on the set and on each value', async function() {
    const setValidateCalls = [];
    const Test = db.model('Test', new Schema({
      nums: {
        type: Set,
        of: { type: Number, min: 0 },
        required: true,
        validate: v => {
          setValidateCalls.push(v);
          return v.size <= 3;
        }
      }
    }));

    await Test.create({ nums: [1, 2] });
    assert.equal(setValidateCalls.length, 1);
    assert.ok(setValidateCalls[0] instanceof mongoose.Types.Set);

    let err = await Test.create({ nums: [1, -1] }).then(() => null, err => err);
    assert.ok(err.errors['nums']);
    assert.equal(err.errors['nums'].kind, 'min');

    err = await Test.create({ nums: [1, 2, 3, 4] }).then(() => null, err => err);
    assert.equal(err.errors['nums'].kind, 'user defined');

    err = await Test.create({}).then(() => null, err => err);
    assert.equal(err.errors['nums'].kind, 'required');
  });

  it('supports defaults', function() {
    const Test = db.model('Test', new Schema({
      tags: { type: Set, of: String, default: () => ['a', 'b'] },
      other: { type: Set, of: String }
    }));

    const doc = new Test();
    assert.ok(doc.tags instanceof mongoose.Types.Set);
    assert.deepStrictEqual(Array.from(doc.tags), ['a', 'b']);
    assert.strictEqual(doc.other, undefined);

    doc.tags.add('c');
    assert.deepStrictEqual(Array.from(new Test().tags), ['a', 'b']);
  });

  it('toObject() and toJSON() convert sets to arrays', function() {
    const Test = db.model('Test', new Schema({
      tags: { type: Set, of: String },
      ids: { type: Set, of: 'ObjectId' }
    }));

    const id = new mongoose.Types.ObjectId();
    const doc = new Test({ tags: ['a', 'b'], ids: [id] });

    const obj = doc.toObject();
    assert.deepStrictEqual(obj.tags, ['a', 'b']);
    assert.ok(obj.ids[0] instanceof mongoose.Types.ObjectId);
    assert.deepStrictEqual(doc.toObject({ flattenObjectIds: true }).ids, [id.toHexString()]);

    assert.deepStrictEqual(doc.toJSON().tags, ['a', 'b']);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(doc)).tags, ['a', 'b']);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(doc.tags)), ['a', 'b']);
  });

  it('$clone() keeps sets as sets', function() {
    const Test = db.model('Test', new Schema({ tags: { type: Set, of: String } }));

    const doc = new Test({ tags: ['a'] });
    const clone = doc.$clone();
    assert.ok(clone.tags instanceof mongoose.Types.Set);
    assert.notStrictEqual(clone.tags, doc.tags);
    assert.strictEqual(clone.tags.$__parent, clone);

    clone.tags.add('b');
    assert.deepStrictEqual(Array.from(doc.tags), ['a']);
  });

  it('query casting', async function() {
    const Test = db.model('Test', new Schema({ nums: { type: Set, of: Number } }));

    await Test.create([{ nums: [1, 2] }, { nums: [2, 3] }]);

    assert.equal(await Test.countDocuments({ nums: '2' }), 2);
    assert.equal(await Test.countDocuments({ nums: ['1', '2'] }), 1);
    assert.equal(await Test.countDocuments({ nums: new Set(['2', '3']) }), 1);
    assert.equal(await Test.countDocuments({ nums: { $all: ['2', '3'] } }), 1);
    assert.equal(await Test.countDocuments({ nums: { $in: ['1', '4'] } }), 1);
    assert.equal(await Test.countDocuments({ nums: { $gt: '2' } }), 1);
    assert.equal(await Test.countDocuments({ nums: { $size: '2' } }), 2);

    const filter = Test.find({ nums: { $nin: ['1'], $ne: '3' } }).cast();
    assert.deepStrictEqual(filter, { nums: { $nin: [1], $ne: 3 } });

    await assert.rejects(Test.find({ nums: 'fail' }), /Cast to Number failed/);
  });

  it('update casting', async function() {
    const Test = db.model('Test', new Schema({ nums: { type: Set, of: Number } }));

    const { _id } = await Test.create({ nums: [1] });

    await Test.updateOne({ _id }, { $set: { nums: ['1', '2', '2'] } });
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).nums, [1, 2]);

    await Test.updateOne({ _id }, { nums: new Set(['3']) });
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).nums, [3]);

    await Test.updateOne({ _id }, { $addToSet: { nums: '4' } });
    await Test.updateOne({ _id }, { $addToSet: { nums: { $each: ['4', '5'] } } });
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).nums, [3, 4, 5]);

    await Test.updateOne({ _id }, { $pull: { nums: '4' } });
    assert.deepStrictEqual((await Test.collection.findOne({ _id })).nums, [3, 5]);

    const doc = await Test.findOneAndUpdate({ _id }, { $set: { nums: [6] } }, { returnDocument: 'after' });
    assert.ok(doc.nums instanceof mongoose.Types.Set);
    assert.deepStrictEqual(Array.from(doc.nums), [6]);
  });

  it('throws if `of` is a subdocument, array, map, or set', function() {
    assert.throws(() => {
      new Schema({ test: { type: Set, of: { name: String } } });
    }, /Sets do not support subdocuments/);
    assert.throws(() => {
      new Schema({ test: { type: Set, of: new Schema({ name: String }) } });
    }, /Sets do not support subdocuments/);
    assert.throws(() => {
      new Schema({ test: { type: Set, of: [String] } });
    }, /Sets do not support subdocuments/);
    assert.throws(() => {
      new Schema({ test: { type: Set, of: Map } });
    }, /Sets do not support subdocuments/);
  });
});
