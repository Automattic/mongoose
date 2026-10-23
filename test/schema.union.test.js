'use strict';

const start = require('./common');
const util = require('./util');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Union', function() {
  let db;

  before(async function() {
    db = await start().asPromise();
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => db.deleteModel(/Test/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('basic functionality should work', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, String]
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 1 });
    assert.strictEqual(doc1.test, 1);
    await doc1.save();

    const doc1FromDb = await TestModel.collection.findOne({ _id: doc1._id });
    assert.strictEqual(doc1FromDb.test, 1);

    const doc2 = new TestModel({ test: 'abc' });
    assert.strictEqual(doc2.test, 'abc');
    await doc2.save();

    const doc2FromDb = await TestModel.collection.findOne({ _id: doc2._id });
    assert.strictEqual(doc2FromDb.test, 'abc');
  });

  it('should report last cast error', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, Boolean]
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 'taco tuesday' });
    assert.strictEqual(doc1.test, undefined);
    await assert.rejects(
      doc1.save(),
      'ValidationError: test: Cast to Boolean failed for value "taco tuesday" (type string) at path "test" because of "CastError"'
    );
  });

  it('should cast for query', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, Date]
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 1 });
    assert.strictEqual(doc1.test, 1);
    await doc1.save();

    let res = await TestModel.findOne({ test: 1 });
    assert.strictEqual(res.test, 1);

    res = await TestModel.findOne({ test: '1' });
    assert.strictEqual(res.test, 1);

    await TestModel.create({ test: new Date('2025-06-01') });
    res = await TestModel.findOne({ test: '2025-06-01' });
    assert.strictEqual(res.test.valueOf(), new Date('2025-06-01').valueOf());
  });

  it('should cast updates', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, Date]
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 1 });
    assert.strictEqual(doc1.test, 1);
    await doc1.save();

    let res = await TestModel.findOneAndUpdate({ _id: doc1._id }, { test: '1' }, { returnDocument: 'after' });
    assert.strictEqual(res.test, 1);

    res = await TestModel.findOneAndUpdate({ _id: doc1._id }, { test: new Date('2025-06-01') }, { returnDocument: 'after' });
    assert.strictEqual(res.test.valueOf(), new Date('2025-06-01').valueOf());
  });

  it('should handle setters', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [
          Number,
          {
            type: String,
            trim: true
          }
        ]
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 1 });
    assert.strictEqual(doc1.test, 1);
    await doc1.save();

    const doc2 = new TestModel({ test: '   bbb  ' });
    assert.strictEqual(doc2.test, 'bbb');
    await doc2.save();

    const doc2FromDb = await TestModel.collection.findOne({ _id: doc2._id });
    assert.strictEqual(doc2FromDb.test, 'bbb');
  });

  it('should handle setters declared on the union path itself', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [
          Number,
          {
            type: String,
            trim: true
          }
        ],
        set: v => typeof v === 'string' ? v.replace(/^prefix:/, '') : v * 2
      }
    });
    const TestModel = db.model('Test', schema);

    const doc1 = new TestModel({ test: 21 });
    assert.strictEqual(doc1.test, 42);

    // The union's setter runs before the setters of the type it resolves to,
    // so `trim` sees the value the union setter returned.
    const doc2 = new TestModel({ test: 'prefix:  bbb  ' });
    assert.strictEqual(doc2.test, 'bbb');
    await doc2.save();

    const doc2FromDb = await TestModel.collection.findOne({ _id: doc2._id });
    assert.strictEqual(doc2FromDb.test, 'bbb');

    const res = await TestModel.findOne({ test: 'prefix:  bbb  ' });
    assert.strictEqual(res.test, 'bbb');
  });

  it('should support immutable on union paths', async function() {
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, String],
        immutable: true
      }
    }, { strict: 'throw' });
    const TestModel = db.model('Test', schema);

    const doc = await TestModel.create({ test: 'first' });
    doc.test = 'second';
    assert.strictEqual(doc.test, 'first');

    doc.set({ test: 'third' });
    const err = await doc.save().then(() => null, err => err);
    assert.ok(err);
    assert.strictEqual(err.errors['test'].name, 'StrictModeError');
  });

  it('passes prior value and set options to setters on union paths', function() {
    const args = [];
    const schema = new Schema({
      test: {
        type: 'Union',
        of: [Number, String],
        set: function(v, priorVal, schematype, options) {
          args.push([v, priorVal, schematype, options]);
          return v;
        }
      }
    });
    const TestModel = db.model('Test', schema);

    const doc = new TestModel({ test: 'first' });
    doc.test = 'second';

    assert.strictEqual(args.length, 2);
    const [value, priorVal, schematype, setOptions] = args[1];
    assert.strictEqual(value, 'second');
    assert.strictEqual(priorVal, 'first');
    assert.strictEqual(schematype.instance, 'Union');
    assert.strictEqual(setOptions.path, 'test');
  });

  it('does not apply union setters when hydrating from the database', async function() {
    const schema = new Schema({
      arr: [{
        type: 'Union',
        of: [Number, String],
        set: v => typeof v === 'number' ? v * 2 : v
      }]
    });
    const TestModel = db.model('Test', schema);

    const doc = new TestModel({ arr: [21] });
    assert.strictEqual(doc.arr[0], 42);
    await doc.save();

    const docFromDb = await TestModel.findById(doc._id);
    assert.strictEqual(docFromDb.arr[0], 42);
  });

  it('handles arrays of unions (gh-15718)', async function() {
    const schema = new Schema({
      arr: [{
        type: 'Union',
        of: [Number, Date]
      }]
    });
    const TestModel = db.model('Test', schema);

    const numValue = 42;
    const dateValue = new Date('2025-06-01');

    const doc = new TestModel({
      arr: [numValue, dateValue]
    });

    await doc.save();

    const found = await TestModel.collection.findOne({ _id: doc._id });
    assert.strictEqual(found.arr.length, 2);
    assert.strictEqual(found.arr[0], numValue);
    assert.strictEqual(new Date(found.arr[1]).valueOf(), dateValue.valueOf());
  });
});
