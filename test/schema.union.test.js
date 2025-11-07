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
