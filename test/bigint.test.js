'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('BigInt', function() {
  beforeEach(() => mongoose.deleteModel(/Test/));

  it('is a valid schema type', function() {
    const schema = new Schema({
      myBigInt: BigInt
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      myBigInt: 42n
    });
    assert.strictEqual(doc.myBigInt, 42n);
    assert.equal(typeof doc.myBigInt, 'bigint');
  });

  it('casting from strings and numbers', function() {
    const schema = new Schema({
      bigint1: {
        type: BigInt
      },
      bigint2: 'BigInt'
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      bigint1: 42,
      bigint2: '997'
    });
    assert.strictEqual(doc.bigint1, 42n);
    assert.strictEqual(doc.bigint2, 997n);
  });

  it('handles cast errors', async function() {
    const schema = new Schema({
      bigint: 'BigInt'
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      bigint: 'foo bar'
    });
    assert.strictEqual(doc.bigint, undefined);

    const err = await doc.validate().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['bigint']);
    assert.equal(err.errors['bigint'].name, 'CastError');
    assert.equal(
      err.errors['bigint'].message,
      'Cast to BigInt failed for value "foo bar" (type string) at path "bigint" because of "SyntaxError"'
    );
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
        myBigInt: BigInt
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

    it('is stored as a long in MongoDB', async function() {
      await Test.create({ myBigInt: 42n });

      const doc = await Test.findOne({ myBigInt: { $type: 'long' } });
      assert.ok(doc);
      assert.strictEqual(doc.myBigInt, 42n);
    });

    it('becomes a bigint with lean using useBigInt64', async function() {
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
