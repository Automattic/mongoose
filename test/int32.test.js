'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Int32', function() {
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

  it('supports the \'required\' property', async function() {
    const schema = new Schema({
      int32: {
        type: Schema.Types.Int32,
        required: true
      }
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      int: null
    });

    const err = await doc.validate().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['int32']);
    assert.equal(err.errors['int32'].name, 'ValidatorError');
    assert.equal(
      err.errors['int32'].message,
      'Path `int32` is required.'
    );
  });

  describe('valid casts', function() {
    it('casts from string', function() {
      const schema = new Schema({
        int1: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        int1: -42
      });
      assert.strictEqual(doc.int1, -42);
    });

    it('casts from number', function() {
      const schema = new Schema({
        int2: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        int2: '-997.0'
      });
      assert.strictEqual(doc.int2, -997);
    });
  });

  describe('cast errors', () => {
    let Test;

    beforeEach(function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      Test = mongoose.model('Test', schema);
    });

    describe('when a non-integer input is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: -42.4
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "-42.4" (type number) at path "myInt"'
        );
      });
    });

    describe('when a non-numeric string is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: 'helloworld'
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "helloworld" (type string) at path "myInt"'
        );
      });
    });

    describe('when NaN is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: NaN
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "NaN" (type number) at path "myInt"'
        );
      });
    });

    describe('when value above INT32_MAX is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: 0x7FFFFFFF + 1
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "2147483648" (type number) at path "myInt"'
        );
      });
    });

    describe('when value below INT32_MIN is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: -0x80000000 - 1
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "-2147483649" (type number) at path "myInt"'
        );
      });
    });
  });

  describe('mongoDB integration', function() {
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

    describe('$type compatibility', function() {
      it('is queryable as a JS number in MongoDB', async function() {
        await Test.create({ myInt: '42' });
        const doc = await Test.findOne({ myInt: { $type: 'number' } });
        assert.ok(doc);
        assert.strictEqual(doc.myInt, 42);
      });

      it('is queryable as a BSON Int32 in MongoDB', async function() {
        await Test.create({ myInt: '42' });
        const doc = await Test.findOne({ myInt: { $type: 'int' } });
        assert.ok(doc);
        assert.strictEqual(doc.myInt, 42);
      });

      it('is queryable as a BSON Double in MongoDB', async function() {
        await Test.create({ myInt: '42' });
        const doc = await Test.findOne({ myInt: { $type: 'double' } });
        assert.equal(doc, undefined);
      });
    });

    it('can query with comparison operators', async function() {
      await Test.create([
        { myInt: 1 },
        { myInt: 2 },
        { myInt: 3 },
        { myInt: 4 }
      ]);

      let docs = await Test.find({ myInt: { $gte: 3 } }).sort({ myInt: 1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myInt), [3, 4]);

      docs = await Test.find({ myInt: { $lt: 3 } }).sort({ myInt: -1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myInt), [2, 1]);
    });

    it('supports populate()', async function() {
      const parentSchema = new Schema({
        child: {
          type: Schema.Types.Int32,
          ref: 'Child'
        }
      });
      const childSchema = new Schema({
        _id: Schema.Types.Int32,
        name: String
      });
      const Parent = db.model('Parent', parentSchema);
      const Child = db.model('Child', childSchema);

      const { _id } = await Parent.create({ child: 42 });
      await Child.create({ _id: 42, name: 'test-int32-populate' });

      const doc = await Parent.findById(_id).populate('child');
      assert.ok(doc);
      assert.equal(doc.child.name, 'test-int32-populate');
      assert.equal(doc.child._id, 42);
    });
  });
});
