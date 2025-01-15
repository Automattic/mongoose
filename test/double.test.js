'use strict';

const assert = require('assert');
const start = require('./common');
const BSON = require('bson');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;


describe('Double', function() {
  beforeEach(() => mongoose.deleteModel(/Test/));

  it('is a valid schema type', function() {
    const schema = new Schema({
      myDouble: Schema.Types.Double
    });
    const Test = mongoose.model('Test', schema);

    const doc = new Test({
      myDouble: 13
    });
    assert.deepStrictEqual(doc.myDouble, new BSON.Double(13));
    assert.equal(typeof doc.myDouble, 'object');
  });

  describe('supports the required property', function() {
    it('when value is null', async function() {
      const schema = new Schema({
        Double: {
          type: Schema.Types.Double,
          required: true
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        double: null
      });

      const err = await doc.validate().then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.errors['Double']);
      assert.equal(err.errors['Double'].name, 'ValidatorError');
      assert.equal(
        err.errors['Double'].message,
        'Path `Double` is required.'
      );
    });
    it('when value is non-null', async function() {
      const schema = new Schema({
        Double: {
          type: Schema.Types.Double,
          required: true
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        double: 3
      });

      const err = await doc.validate().then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.errors['Double']);
      assert.equal(err.errors['Double'].name, 'ValidatorError');
      assert.equal(
        err.errors['Double'].message,
        'Path `Double` is required.'
      );
    });
  });

  describe('special inputs', function() {
    it('supports undefined as input', function() {
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: undefined
      });
      assert.deepStrictEqual(doc.myDouble, undefined);
    });

    it('supports null as input', function() {
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: null
      });
      assert.deepStrictEqual(doc.myDouble, null);
    });
  });

  describe('valid casts', function() {
    it('casts from decimal string', function() {
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: '-42.008'
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(-42.008));
    });

    it('casts from exponential string', function() {
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: '1.22008e45'
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(1.22008e45));
    });

    it('casts from infinite string', function() {
      const schema = new Schema({
        myDouble1: {
          type: Schema.Types.Double
        },
        myDouble2: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble1: 'Infinity',
        myDouble2: '-Infinity'
      });
      assert.deepStrictEqual(doc.myDouble1, new BSON.Double(Infinity));
      assert.deepStrictEqual(doc.myDouble2, new BSON.Double(-Infinity));
    });

    it('casts from NaN string', function() {
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: 'NaN'
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double('NaN'));
    });

    it('casts from number', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: 988
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(988));
    });

    it('casts from bigint', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: -997n
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(-997));
    });

    it('casts from BSON.Long', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: BSON.Long.fromNumber(-997987)
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(-997987));
    });

    it('casts from BSON.Double', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: new BSON.Double(-997983.33)
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(-997983.33));
    });

    it('casts boolean true to 1', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: true
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(1));
    });

    it('casts boolean false to 0', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: false
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(0));
    });

    it('casts empty string to null', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: ''
      });
      assert.deepStrictEqual(doc.myDouble, null);
    });

    it('supports valueOf() function ', function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      const Test = mongoose.model('Test', schema);

      const doc = new Test({
        myDouble: { a: 'random', b: { c: 'whatever' }, valueOf: () => 83.008 }
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(83.008));
    });
  });

  describe('cast errors', () => {
    let Test;

    beforeEach(function() {
      const schema = new Schema({
        myDouble: Schema.Types.Double
      });
      Test = mongoose.model('Test', schema);
    });

    describe('when a non-numeric string is provided to an Double field', () => {
      it('throws a CastError upon validation', async() => {
        const doc = new Test({
          myDouble: 'helloworld'
        });

        assert.deepStrictEqual(doc.myDouble, undefined);
        const err = await doc.validate().catch(e => e);
        assert.ok(err);
        assert.ok(err.errors['myDouble']);
        assert.equal(err.errors['myDouble'].name, 'CastError');
        assert.equal(
          err.errors['myDouble'].message,
          'Cast to Double failed for value "helloworld" (type string) at path "myDouble"'
        );
      });
    });
  });

  describe('custom casters', () => {
    const defaultCast = mongoose.Schema.Types.Double.cast();

    afterEach(() => {
      mongoose.Schema.Types.Double.cast(defaultCast);
    });

    it('supports cast disabled', async() => {
      mongoose.Schema.Types.Double.cast(false);
      const schema = new Schema({
        myDouble1: {
          type: Schema.Types.Double
        },
        myDouble2: {
          type: Schema.Types.Double
        }
      });
      const Test = mongoose.model('Test', schema);
      const doc = new Test({
        myDouble1: '52',
        myDouble2: new BSON.Double(52)
      });
      assert.deepStrictEqual(doc.myDouble1, undefined);
      assert.deepStrictEqual(doc.myDouble2, new BSON.Double(52));

      const err = await doc.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors['myDouble1']);
    });

    it('supports custom cast', () => {
      mongoose.Schema.Types.Double.cast(v => {
        if (isNaN(v)) {
          return new BSON.Double(2);
        }
        return defaultCast(v);
      });
      const schema = new Schema({
        myDouble: {
          type: Schema.Types.Double
        }
      });

      const Test = mongoose.model('Test', schema);
      const doc = new Test({
        myDouble: NaN
      });
      assert.deepStrictEqual(doc.myDouble, new BSON.Double(2));
    });
  });

  describe('mongoDB integration', function() {
    let db;
    let Test;

    before(async function() {
      db = await start();

      const schema = new Schema({
        myDouble: Schema.Types.Double
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
        await Test.create({ myDouble: '42.04' });
        const doc = await Test.findOne({ myDouble: { $type: 'number' } });
        assert.ok(doc);
        assert.deepStrictEqual(doc.myDouble, new BSON.Double(42.04));
      });

      it('is NOT queryable as a BSON Integer in MongoDB if the value is NOT integer', async function() {
        await Test.create({ myDouble: '42.04' });
        const doc = await Test.findOne({ myDouble: { $type: 'int' } });
        assert.deepStrictEqual(doc, null);
      });

      it('is queryable as a BSON Double in MongoDB when a non-integer is provided', async function() {
        await Test.create({ myDouble: '42.04' });
        const doc = await Test.findOne({ myDouble: { $type: 'double' } });
        assert.deepStrictEqual(doc.myDouble, new BSON.Double(42.04));
      });

      it('is queryable as a BSON Double in MongoDB when an integer is provided', async function() {
        await Test.create({ myDouble: '42' });
        const doc = await Test.findOne({ myDouble: { $type: 'double' } });
        assert.deepStrictEqual(doc.myDouble, new BSON.Double(42));
      });
    });

    it('can query with comparison operators', async function() {
      await Test.create([
        { myDouble: 1.2 },
        { myDouble: 1.709 },
        { myDouble: 1.710 },
        { myDouble: 1.8 }
      ]);

      let docs = await Test.find({ myDouble: { $gte: 1.710 } }).sort({ myDouble: 1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myDouble), [new BSON.Double(1.710), new BSON.Double(1.8)]);

      docs = await Test.find({ myDouble: { $lt: 1.710 } }).sort({ myDouble: -1 });
      assert.equal(docs.length, 2);
      assert.deepStrictEqual(docs.map(doc => doc.myDouble), [new BSON.Double(1.709), new BSON.Double(1.2)]);
    });

    it('supports populate()', async function() {
      const parentSchema = new Schema({
        child: {
          type: Schema.Types.Double,
          ref: 'Child'
        }
      });
      const childSchema = new Schema({
        _id: Schema.Types.Double,
        name: String
      });
      const Parent = db.model('Parent', parentSchema);
      const Child = db.model('Child', childSchema);

      const { _id } = await Parent.create({ child: 42 });
      await Child.create({ _id: 42, name: 'test-Double-populate' });

      const doc = await Parent.findById(_id).populate('child');
      assert.ok(doc);
      assert.equal(doc.child.name, 'test-Double-populate');
      assert.equal(doc.child._id, 42);
    });
  });
});
