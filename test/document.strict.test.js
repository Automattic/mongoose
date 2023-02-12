/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('document: strict mode:', function() {
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

  describe('should work', function() {
    let Lax, Strict;

    beforeEach(function() {
      const raw = {
        ts: { type: Date, default: Date.now },
        content: String,
        mixed: {},
        deepMixed: { '4a': {} },
        arrayMixed: []
      };

      const lax = new Schema(raw, { strict: false, minimize: false });
      const strict = new Schema(raw);

      Lax = db.model('Test1', lax);
      Strict = db.model('Test2', strict);
    });

    it('when creating models with non-strict schemas (gh-4274)', async function() {
      const lax = new Lax({ content: 'sample', rouge: 'data', items: {} });
      assert.equal(lax.$__.strictMode, false);

      const lo = lax.toObject();
      assert.ok('ts' in lax);
      assert.ok('ts' in lo);
      assert.equal(lax.content, 'sample');
      assert.equal(lo.content, 'sample');
      assert.equal(lax.rouge, 'data');
      assert.equal(lo.rouge, 'data');
      assert.deepEqual(lax.items, {});
      assert.deepEqual(lo.items, {});

      await lax.save();

      const doc = await Lax.findById(lax);

      const lo2 = doc.toObject();
      assert.equal(lo2.content, 'sample');
      assert.equal(lo2.rouge, 'data');
      assert.deepEqual(lo2.items, {});
    });

    it('when creating models with strict schemas', function() {
      const s = new Strict({ content: 'sample', rouge: 'data' });
      assert.equal(s.$__.strictMode, true);

      const so = s.toObject();
      assert.ok('ts' in s);
      assert.ok('ts' in so);
      assert.equal(s.content, 'sample');
      assert.equal(so.content, 'sample');
      assert.ok(!('rouge' in s));
      assert.ok(!('rouge' in so));
      assert.ok(!s.rouge);
      assert.ok(!so.rouge);
    });

    it('when overriding strictness', function() {
      // instance override
      let instance = new Lax({ content: 'sample', rouge: 'data' }, true);
      assert.ok(instance.$__.strictMode);

      instance = instance.toObject();
      assert.equal(instance.content, 'sample');
      assert.ok(!instance.rouge);
      assert.ok('ts' in instance);

      // hydrate works as normal, but supports the schema level flag.
      let s2 = new Strict({ content: 'sample', rouge: 'data' }, false);
      assert.equal(s2.$__.strictMode, false);
      s2 = s2.toObject();
      assert.ok('ts' in s2);
      assert.equal(s2.content, 'sample');
      assert.ok('rouge' in s2);

      // testing init
      const s3 = new Strict();
      s3.init({ content: 'sample', rouge: 'data' });
      s3.toObject();
      assert.equal(s3.content, 'sample');
      assert.ok(!('rouge' in s3));
      assert.ok(!s3.rouge);
    });

    it('when using Model#create', async function() {
      // strict on create
      const doc = await Strict.create({ content: 'sample2', rouge: 'data' });
      assert.equal(doc.content, 'sample2');
      assert.ok(!('rouge' in doc));
      assert.ok(!doc.rouge);
    });
  });

  it('nested doc', function() {
    const lax = new Schema({
      name: { last: String }
    }, { strict: false });

    const strict = new Schema({
      name: { last: String }
    });

    const Lax = db.model('Test1', lax);
    const Strict = db.model('Test2', strict);

    let l = new Lax();
    l.set('name', { last: 'goose', hack: 'xx' });
    l = l.toObject();
    assert.equal(l.name.last, 'goose');
    assert.equal(l.name.hack, 'xx');

    let s = new Strict();
    s.set({ name: { last: 'goose', hack: 'xx' } });
    s = s.toObject();
    assert.equal(s.name.last, 'goose');
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);

    s = new Strict();
    s.set('name', { last: 'goose', hack: 'xx' });
    s.set('shouldnt.exist', ':(');
    s = s.toObject();
    assert.equal(s.name.last, 'goose');
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);
    assert.ok(!s.shouldnt);
  });

  it('sub doc', async function() {
    const lax = new Schema({
      ts: { type: Date, default: Date.now },
      content: String
    }, { strict: false });

    const strict = new Schema({
      ts: { type: Date, default: Date.now },
      content: String
    });

    const Lax = db.model('Test1', new Schema({ dox: [lax] }, { strict: false }));
    const Strict = db.model('Test2', new Schema({ dox: [strict] }, { strict: false }));

    let l = new Lax({ dox: [{ content: 'sample', rouge: 'data' }] });
    assert.equal(l.dox[0].$__.strictMode, false);
    l = l.dox[0].toObject();
    assert.equal(l.content, 'sample');
    assert.equal(l.rouge, 'data');
    assert.ok(l.rouge);

    let s = new Strict({ dox: [{ content: 'sample', rouge: 'data' }] });
    assert.equal(s.dox[0].$__.strictMode, true);
    s = s.dox[0].toObject();
    assert.ok('ts' in s);
    assert.equal(s.content, 'sample');
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // testing init
    const s3 = new Strict();
    s3.init({ dox: [{ content: 'sample', rouge: 'data' }] });
    s3.toObject();
    assert.equal(s3.dox[0].content, 'sample');
    assert.ok(!('rouge' in s3.dox[0]));
    assert.ok(!s3.dox[0].rouge);

    // strict on create
    const doc = await Strict.create({ dox: [{ content: 'sample2', rouge: 'data' }] });
    assert.equal(doc.dox[0].content, 'sample2');
    assert.ok(!('rouge' in doc.dox[0]));
    assert.ok(!doc.dox[0].rouge);
  });

  it('virtuals', function() {
    let getCount = 0,
        setCount = 0;

    const strictSchema = new Schema({
      email: String,
      prop: String
    });

    strictSchema
      .virtual('myvirtual')
      .get(function() {
        getCount++;
        return 'ok';
      })
      .set(function(v) {
        setCount++;
        this.prop = v;
      });

    const StrictModel = db.model('Test', strictSchema);

    const strictInstance = new StrictModel({
      email: 'hunter@skookum.com',
      myvirtual: 'test'
    });

    assert.equal(getCount, 0);
    assert.equal(setCount, 1);

    strictInstance.myvirtual = 'anotherone';
    assert.equal(getCount, 0);
    assert.equal(setCount, 2);

    const temp = strictInstance.myvirtual;
    assert.equal('string', typeof temp);
    assert.equal(getCount, 1);
    assert.equal(setCount, 2);
  });

  it('can be overridden during set()', async function() {
    const strict = new Schema({
      bool: Boolean
    });

    const Strict = db.model('Test', strict);
    const s = new Strict({ bool: true });

    // insert non-schema property
    const doc = s.toObject();
    doc.notInSchema = true;

    await Strict.collection.insertOne(doc, { w: 1 });
    const foundDoc = await Strict.findById(doc._id);
    assert.equal(foundDoc._doc.bool, true);
    assert.equal(foundDoc._doc.notInSchema, true);
    foundDoc.bool = undefined;
    foundDoc.set('notInSchema', undefined, { strict: false });
    await foundDoc.save();
    const foundDoc2 = await Strict.findById(doc._id);
    assert.equal(foundDoc2._doc.bool, undefined);
    assert.equal(foundDoc2._doc.notInSchema, undefined);
  });

  it('can be overridden during update()', async function() {
    const strict = new Schema({
      bool: Boolean
    });

    const Strict = db.model('Test', strict);
    const s = new Strict({ bool: true });

    // insert non-schema property
    const doc = s.toObject();
    doc.notInSchema = true;

    await Strict.collection.insertOne(doc);

    const doc2 = await Strict.findById(doc._id);
    assert.equal(doc2._doc.bool, true);
    assert.equal(doc2._doc.notInSchema, true);

    await Strict.updateOne({ _id: doc._id }, { $unset: { bool: 1, notInSchema: 1 } }, { strict: false });

    const doc3 = await Strict.findById(doc._id);
    assert.equal(doc3._doc.bool, undefined);
    assert.equal(doc3._doc.notInSchema, undefined);
  });

  it('can be overwritten with findOneAndUpdate (gh-1967)', async function() {
    const strict = new Schema({
      bool: Boolean
    });

    const Strict = db.model('Test', strict);
    const s = new Strict({ bool: true });

    // insert non-schema property
    const doc = s.toObject();
    doc.notInSchema = true;

    await Strict.collection.insertOne(doc, { w: 1 });

    const doc1 = await Strict.findById(doc._id);
    assert.equal(doc1._doc.bool, true);
    assert.equal(doc1._doc.notInSchema, true);

    await Strict.findOneAndUpdate({ _id: doc._id }, { $unset: { bool: 1, notInSchema: 1 } }, { strict: false, w: 1 });

    const doc2 = await Strict.findById(doc._id);
    assert.equal(doc2._doc.bool, undefined);
    assert.equal(doc2._doc.notInSchema, undefined);
  });

  describe('"throws" mode', function() {
    it('throws on set() of unknown property', function() {
      const schema = new Schema({ n: String, docs: [{ x: [{ y: String }] }] });
      schema.set('strict', 'throw');
      const M = db.model('Test', schema);
      const m = new M();

      const badField = /Field `[\w.]+` is not in schema/;

      assert.throws(function() {
        m.set('unknown.stuff.is.here', 3);
      }, badField);

      assert.throws(function() {
        m.set('n.something', 3);
      }, badField);

      assert.throws(function() {
        m.set('n.3', 3);
      }, badField);

      assert.throws(function() {
        m.set('z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.4.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.4.y.z', 3);
      }, badField);
    });

    it('fails with extra fields', function() {
      // Simple schema with throws option
      const FooSchema = new mongoose.Schema({
        name: { type: String }
      }, { strict: 'throw' });

      // Create the model
      const Foo = db.model('Test', FooSchema);

      assert.doesNotThrow(function() {
        new Foo({ name: 'bar' });
      });

      assert.throws(function() {
        // The extra baz field should throw
        new Foo({ name: 'bar', baz: 'bam' });
      }, /Field `baz` is not in schema/);
    });

    it('doesnt throw with refs (gh-2665)', function() {
      // Simple schema with throws option
      const FooSchema = new mongoose.Schema({
        name: { type: mongoose.Schema.Types.ObjectId, ref: 'test', required: false, default: null },
        father: { name: { full: String } }
      }, { strict: 'throw' });

      // Create the model
      const Foo = db.model('Test', FooSchema);

      assert.doesNotThrow(function() {
        new Foo({ name: new mongoose.Types.ObjectId(), father: { name: { full: 'bacon' } } });
      });
    });

    it('set nested to num throws ObjectExpectedError (gh-3735)', function() {
      const schema = new Schema({
        resolved: {
          by: { type: String }
        }
      }, { strict: 'throw' });

      const Test = db.model('Test', schema);

      assert.throws(function() {
        new Test({ resolved: 123 });
      }, /ObjectExpectedError/);
    });
  });

  it('handles setting `schema.options.strict` (gh-7103)', async function() {
    const nestedSchema = new mongoose.Schema({
      _id: false,
      someProp: {
        type: Boolean,
        default: false,
        required: true
      }
    });

    nestedSchema.options.strict = 'throw';
    nestedSchema.options.strictQuery = 'throw';

    const schema = new mongoose.Schema({
      nested: {
        type: nestedSchema,
        default: null
      }
    });

    const Model = db.model('Test', schema);

    const doc1 = new Model();
    doc1.nested = { someProp: true, somethingElse: false };

    let err = doc1.validateSync();
    assert.ok(err);
    assert.ok(err.errors['nested']);

    err = await doc1.validate().then(() => null, err => err);
    assert.ok(err);

    assert.ok(err.errors['nested']);
  });
});
