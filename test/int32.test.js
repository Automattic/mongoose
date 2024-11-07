'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Int', function() {
  beforeEach(() => mongoose.deleteModel(/Test/));

  it('is a valid schema type', function() {
    const schema = new Schema({
      myInt32: Schema.Types.Int32
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      myInt32: 13
    });
    assert.strictEqual(doc.myInt32, 13);
    assert.equal(typeof doc.myInt32, 'number');
  });

  it('casts from strings and numbers', function() {
    const schema = new Schema({
      int1: {
        type: Schema.Types.Int32
      },
      int2: Schema.Types.Int32
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      int1: -42,
      int2: '-997.0'
    });
    assert.strictEqual(doc.int1, -42);
    assert.strictEqual(doc.int2, -997);
  });

  describe('cast errors', () => {
    let Test;

    beforeEach(function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      Test = mongoose.model('Test', schema);
    });

    describe.only('when a decimal input is provided to an Int32 field', () => {
      it('throws a CastError', async() => {
        const doc = new Test({
          int1: -42.4
        });

        assert.strictEqual(doc.myInt, undefined);

        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          ''
        );
      });
    });

    describe('when a non-numeric string is provided to an Int32 field', () => {
      it('throws a CastError', () => {
        const doc = new Test({
          int1: 'helloworld'
        });
      });
    });

    describe('when NaN is provided to an Int32 field', () => {
      it('throws a CastError', () => {
        const doc = new Test({
          int1: NaN
        });
      });
    });

    describe('when value above INT32_MAX is provided to an Int32 field', () => {
      it('throws a CastError', () => {
        const doc = new Test({
          int1: 0x7FFFFFFF + 1
        });
      });
    });

    describe('when value below INT32_MIN is provided to an Int32 field', () => {
      it('throws a CastError', () => {
        const doc = new Test({
          int1: -0x80000000 - 1
        });
      });
    });
  });

  it('supports required', async function() {
    const schema = new Schema({
      bigint: {
        type: BigInt,
        required: true
      }
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      bigint: null
    });

    const err = await doc.validate().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['bigint']);
    assert.equal(err.errors['bigint'].name, 'ValidatorError');
    assert.equal(
      err.errors['bigint'].message,
      'Path `bigint` is required.'
    );
  });

  describe('MongoDB integration', function() {
    let db;
    let Test;

    before(async function() {
      db = await start();

      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      db.deleteModel(/Test/);
      Test = db.model('Test', schema);
    });

    after(async function() {
      await db.close();
    });

    beforeEach(async() => {
      await Test.deleteMany({});
    });

    it('is stored as a int32 in MongoDB', async function() {
      await Test.create({ myInt: '42' });

      const doc = await Test.findOne({ myInt: { $type: 'int32' } });
      assert.ok(doc);
      assert.strictEqual(doc.myInt, 42);
    });

    it('becomes a int32 with lean using promote Values', async function() {
      await Test.create({ myBigInt: 7n });

      const doc = await Test.
        findOne({ myBigInt: 7n }).
        setOptions({ useBigInt64: true }).
        lean();
      assert.ok(doc);
      assert.strictEqual(doc.myBigInt, 7n);
    });

    it('can query with comparison operators', async function() {
      await Test.create([
        { myBigInt: 1n },
        { myBigInt: 2n },
        { myBigInt: 3n },
        { myBigInt: 4n }
      ]);

      let docs = await Test.find({ myBigInt: { $gte: 3n } }).sort({ myBigInt: 1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myBigInt), [3n, 4n]);

      docs = await Test.find({ myBigInt: { $lt: 3n } }).sort({ myBigInt: -1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myBigInt), [2n, 1n]);
    });

    it('supports populate()', async function() {
      const parentSchema = new Schema({
        child: {
          type: BigInt,
          ref: 'Child'
        }
      });
      const childSchema = new Schema({
        _id: BigInt,
        name: String
      });
      const Parent = db.model('Parent', parentSchema);
      const Child = db.model('Child', childSchema);

      const { _id } = await Parent.create({ child: 42n });
      await Child.create({ _id: 42n, name: 'test-bigint-populate' });

      const doc = await Parent.findById(_id).populate('child');
      assert.ok(doc);
      assert.equal(doc.child.name, 'test-bigint-populate');
      assert.equal(doc.child._id, 42n);
    });
  });
});