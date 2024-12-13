'use strict';

const assert = require('assert');
const start = require('./common');
const BSON = require('bson');
const sinon = require('sinon');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const INT32_MAX = 0x7FFFFFFF;
const INT32_MIN = -0x80000000;

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

  describe('supports the required property', function() {
    it('when value is null', async function() {
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
    it('when value is non-null', async function() {
      const schema = new Schema({
        int32: {
          type: Schema.Types.Int32,
          required: true
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        int: 3
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
  });

  describe('special inputs', function() {
    it('supports INT32_MIN as input', function() {
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: INT32_MIN
      });
      assert.strictEqual(doc.myInt, INT32_MIN);
    });

    it('supports INT32_MAX as input', function() {
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: INT32_MAX
      });
      assert.strictEqual(doc.myInt, INT32_MAX);
    });

    it('supports undefined as input', function() {
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: undefined
      });
      assert.strictEqual(doc.myInt, undefined);
    });

    it('supports null as input', function() {
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: null
      });
      assert.strictEqual(doc.myInt, null);
    });
  });

  describe('valid casts', function() {
    it('casts from string', function() {
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: '-42'
      });
      assert.strictEqual(doc.myInt, -42);
    });

    it('casts from number', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: '-997.0'
      });
      assert.strictEqual(doc.myInt, -997);
    });

    it('casts from bigint', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: -997n
      });
      assert.strictEqual(doc.myInt, -997);
    });

    it('casts from BSON.Int32', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: new BSON.Int32(-997)
      });
      assert.strictEqual(doc.myInt, -997);
    });

    describe('long', function() {
      after(function() {
        sinon.restore();
      });

      it('casts from BSON.Long provided its value is within bounds of Int32', function() {
        const schema = new Schema({
          myInt: Schema.Types.Int32
        });
        const Test = mongoose.model('Test', schema);

        const doc = new Test({
          myInt: BSON.Long.fromNumber(-997)
        });
        assert.strictEqual(doc.myInt, -997);
      });

      it('calls Long.toNumber when casting long', function() {
        // this is a perf optimization, since long.toNumber() is faster than Number(long)
        const schema = new Schema({
          myInt: Schema.Types.Int32
        });
        const Test = mongoose.model('Test', schema);

        sinon.stub(BSON.Long.prototype, 'toNumber').callsFake(function() {
          return 2;
        });

        const doc = new Test({
          myInt: BSON.Long.fromNumber(-997)
        });

        assert.strictEqual(doc.myInt, 2);
      });
    });

    it('casts from BSON.Double provided its value is an integer', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: new BSON.Double(-997)
      });
      assert.strictEqual(doc.myInt, -997);
    });

    it('casts boolean true to 1', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: true
      });
      assert.strictEqual(doc.myInt, 1);
    });

    it('casts boolean false to 0', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: false
      });
      assert.strictEqual(doc.myInt, 0);
    });

    it('casts empty string to null', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: ''
      });
      assert.strictEqual(doc.myInt, null);
    });

    it('supports valueOf() function ', function() {
      const schema = new Schema({
        myInt: Schema.Types.Int32
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myInt: { a: 'random', b: { c: 'whatever' }, valueOf: () => 83 }
      });
      assert.strictEqual(doc.myInt, 83);
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

    describe('when a non-integer decimal input is provided to an Int32 field', () => {
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

    describe('when a non-integer decimal string is provided to an Int32 field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myInt: '1.2'
        });

        assert.strictEqual(doc.myInt, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myInt']);
        assert.equal(err.errors['myInt'].name, 'CastError');
        assert.equal(
          err.errors['myInt'].message,
          'Cast to Int32 failed for value "1.2" (type string) at path "myInt"'
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
          myInt: INT32_MAX + 1
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
          myInt: INT32_MIN - 1
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

  describe('custom casters', () => {
    const defaultCast = mongoose.Schema.Types.Int32.cast();

    afterEach(() => {
      mongoose.Schema.Types.Int32.cast(defaultCast);
    });

    it('supports cast disabled', async() => {
      mongoose.Schema.Types.Int32.cast(false);
      const schema = new Schema({
        myInt1: {
          type: Schema.Types.Int32
        },
        myInt2: {
          type: Schema.Types.Int32
        }
      });
      const Test = mongoose.model('Test', schema);
      const doc = new Test({
        myInt1: '52',
        myInt2: 52
      });
      assert.strictEqual(doc.myInt1, undefined);
      assert.strictEqual(doc.myInt2, 52);

      const err = await doc.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors['myInt1']);
    });

    it('supports custom cast', () => {
      mongoose.Schema.Types.Int32.cast(v => {
        if (isNaN(v)) {
          return 0;
        }
        return defaultCast(v);
      });
      const schema = new Schema({
        myInt: {
          type: Schema.Types.Int32
        }
      });

      const Test = mongoose.model('Test', schema);
      const doc = new Test({
        myInt: NaN
      });
      assert.strictEqual(doc.myInt, 0);
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

      it('is NOT queryable as a BSON Double in MongoDB', async function() {
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
