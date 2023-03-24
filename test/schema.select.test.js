'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema select option', function() {
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

  it('excluding paths through schematype', async function() {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: false },
      docs: [new Schema({ bool: Boolean, name: { type: String, select: false } })]
    });

    const Test = db.model('Test', schema);
    const doc = await Test.create({
      thin: true,
      name: 'the excluded',
      docs: [{ bool: true, name: 'test' }]
    });
    assert.equal(doc.name, 'the excluded');
    assert.equal(doc.docs[0].name, 'test');
    const findByIdDoc = await Test.findById({ _id: doc._id }).select('-thin -docs.bool');
    assert.equal(findByIdDoc.isSelected('name'), false);
    assert.equal(findByIdDoc.isSelected('docs.name'), false);
    assert.strictEqual(undefined, findByIdDoc.name);
    const findDoc = await Test.find({ _id: doc._id }).select('thin docs.bool');
    const singleFindDoc = findDoc[0];
    assert.equal(singleFindDoc.isSelected('name'), false);
    assert.equal(singleFindDoc.isSelected('docs.name'), false);
    assert.strictEqual(undefined, singleFindDoc.name);
    const findByIdDocAgain = await Test.findById({ _id: doc._id });
    assert.equal(findByIdDocAgain.isSelected('name'), false);
    assert.equal(findByIdDocAgain.isSelected('docs.name'), false);
    assert.strictEqual(undefined, findByIdDocAgain.name);
    const findUpdateDoc = await Test.findOneAndUpdate({ _id: doc._id });
    assert.equal(findUpdateDoc.isSelected('name'), false);
    assert.equal(findUpdateDoc.isSelected('docs.name'), false);
    assert.strictEqual(undefined, findUpdateDoc.name);
    const findAndRemoveDoc = await Test.findOneAndRemove({ _id: doc._id });
    assert.equal(findAndRemoveDoc.isSelected('name'), false);
    assert.equal(findAndRemoveDoc.isSelected('docs.name'), false);
    assert.strictEqual(undefined, findAndRemoveDoc.name);
  });

  it('including paths through schematype', async function() {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: true },
      docs: [new Schema({ bool: Boolean, name: { type: String, select: true } })]
    });

    const S = db.model('Test', schema);
    const doc = await S.create({ thin: true, name: 'the included', docs: [{ bool: true, name: 'test' }] });
    assert.equal(doc.name, 'the included');
    assert.equal(doc.docs[0].name, 'test');
    const findByIdDoc = await S.findById({ _id: doc._id }).select('-thin -docs.bool');
    assert.strictEqual(true, findByIdDoc.isSelected('name'));
    assert.strictEqual(true, findByIdDoc.isSelected('docs.name'));
    assert.equal(findByIdDoc.name, 'the included');
    const findDoc = await S.find({ _id: doc._id });
    const singleFindDoc = findDoc[0];
    assert.strictEqual(true, singleFindDoc.isSelected('name'));
    assert.strictEqual(true, singleFindDoc.isSelected('docs.name'));
    assert.equal(singleFindDoc.name, 'the included');
    const findOneAndUpdateDoc = await S.findOneAndUpdate({ _id: doc._id }, { thin: false });
    assert.strictEqual(true, findOneAndUpdateDoc.isSelected('name'));
    assert.strictEqual(true, findOneAndUpdateDoc.isSelected('docs.name'));
    assert.equal(findOneAndUpdateDoc.name, 'the included');
    const findOneAndRemoveDoc = await S.findOneAndRemove({ _id: doc._id });
    assert.strictEqual(true, findOneAndRemoveDoc.isSelected('name'));
    assert.strictEqual(true, findOneAndRemoveDoc.isSelected('docs.name'));
    assert.equal(findOneAndRemoveDoc.name, 'the included');
  });

  describe('overriding schematype select options', function() {
    let selected, excluded, S, E;

    before(function() {
      selected = new Schema({
        thin: Boolean,
        name: { type: String, select: true },
        docs: [new Schema({ name: { type: String, select: true }, bool: Boolean })]
      });
      excluded = new Schema({
        thin: Boolean,
        name: { type: String, select: false },
        docs: [new Schema({ name: { type: String, select: false }, bool: Boolean })]
      });

      S = db.model('Test1', selected);
      E = db.model('Test2', excluded);
    });

    describe('works', function() {
      describe('for inclusions', function() {
        let inclusionDoc;
        beforeEach(async function() {
          inclusionDoc = await S.create({ thin: true, name: 'the included', docs: [{ name: 'test', bool: true }] });
          assert.equal(inclusionDoc.name, 'the included');
          assert.equal(inclusionDoc.docs[0].name, 'test');
        });
        it('with find', async function() {
          const findDoc = await S.find({ _id: inclusionDoc._id }).select('thin name docs.bool docs.name');
          assert.ok(findDoc && findDoc.length > 0, 'no document found');
          const singleFindDoc = findDoc[0];
          assert.strictEqual(true, singleFindDoc.isSelected('name'));
          assert.strictEqual(true, singleFindDoc.isSelected('thin'));
          assert.strictEqual(true, singleFindDoc.isSelected('docs.name'));
          assert.strictEqual(true, singleFindDoc.isSelected('docs.bool'));
          assert.strictEqual(singleFindDoc.name, 'the included');
          assert.strictEqual(singleFindDoc.docs[0].name, 'test');
          assert.ok(singleFindDoc.thin);
          assert.ok(singleFindDoc.docs[0].bool);
        });
        it('for findById', async function() {
          const findByIdDoc = await S.findById({ _id: inclusionDoc._id }).select('-name -docs.name');
          assert.equal(findByIdDoc.isSelected('name'), false);
          assert.equal(findByIdDoc.isSelected('thin'), true);
          assert.equal(findByIdDoc.isSelected('docs.name'), false);
          assert.equal(findByIdDoc.isSelected('docs.bool'), true);
          assert.ok(findByIdDoc.isSelected('docs'));
          assert.strictEqual(undefined, findByIdDoc.name);
          assert.strictEqual(undefined, findByIdDoc.docs[0].name);
          assert.equal(findByIdDoc.thin, true);
          assert.equal(findByIdDoc.docs[0].bool, true);
        });
        it('with findOneAndUpdate', async function() {
          const findOneAndUpdateDoc = await S.findOneAndUpdate({ _id: inclusionDoc._id }, { name: 'changed' }, { new: true }).select('thin name docs.bool docs.name');
          assert.strictEqual(true, findOneAndUpdateDoc.isSelected('name'));
          assert.strictEqual(true, findOneAndUpdateDoc.isSelected('thin'));
          assert.strictEqual(true, findOneAndUpdateDoc.isSelected('docs.name'));
          assert.strictEqual(true, findOneAndUpdateDoc.isSelected('docs.bool'));
          assert.equal(findOneAndUpdateDoc.name, 'changed');
          assert.equal(findOneAndUpdateDoc.docs[0].name, 'test');
          assert.ok(findOneAndUpdateDoc.thin);
          assert.ok(findOneAndUpdateDoc.docs[0].bool);
        });
        it('for findByIdAndUpdate', async function() {
          const findByIdAndUpdateDoc = await S.findByIdAndUpdate({ _id: inclusionDoc._id }, { thin: false }, { new: true }).select('-name -docs.name');
          assert.equal(findByIdAndUpdateDoc.isSelected('name'), false);
          assert.equal(findByIdAndUpdateDoc.isSelected('thin'), true);
          assert.equal(findByIdAndUpdateDoc.isSelected('docs.name'), false);
          assert.equal(findByIdAndUpdateDoc.isSelected('docs.bool'), true);
          assert.strictEqual(undefined, findByIdAndUpdateDoc.name);
          assert.strictEqual(undefined, findByIdAndUpdateDoc.docs[0].name);
          assert.equal(findByIdAndUpdateDoc.thin, false);
          assert.equal(findByIdAndUpdateDoc.docs[0].bool, true);
        });
      });

      describe('for exclusions', function() {
        let exclusionDoc;
        beforeEach(async function() {
          exclusionDoc = await E.create({ thin: true, name: 'the excluded', docs: [{ name: 'test', bool: true }] });
          assert.equal(exclusionDoc.name, 'the excluded');
          assert.equal(exclusionDoc.docs[0].name, 'test');
        });
        it('with find', async function() {
          const findDoc = await E.find({ _id: exclusionDoc._id }).select('thin name docs.name docs.bool');
          const singleFindDoc = findDoc[0];
          assert.equal(singleFindDoc.isSelected('name'), true);
          assert.equal(singleFindDoc.isSelected('thin'), true);
          assert.equal(singleFindDoc.isSelected('docs.name'), true);
          assert.equal(singleFindDoc.isSelected('docs.bool'), true);
          assert.equal(singleFindDoc.name, 'the excluded');
          assert.equal(singleFindDoc.docs[0].name, 'test');
          assert.ok(singleFindDoc.thin);
          assert.ok(singleFindDoc.docs[0].bool);
        });
        it('with findById', async function() {
          const findByIdDoc = await E.findById({ _id: exclusionDoc._id }).select('-name -docs.name');
          assert.equal(findByIdDoc.isSelected('name'), false);
          assert.equal(findByIdDoc.isSelected('thin'), true);
          assert.equal(findByIdDoc.isSelected('docs.name'), false);
          assert.equal(findByIdDoc.isSelected('docs.bool'), true);
          assert.strictEqual(undefined, findByIdDoc.name);
          assert.strictEqual(undefined, findByIdDoc.docs[0].name);
          assert.strictEqual(true, findByIdDoc.thin);
          assert.strictEqual(true, findByIdDoc.docs[0].bool);
        });
        it('with findOneAndUpdate', async function() {
          const findOneAndUpdateDoc = await E.findOneAndUpdate({ _id: exclusionDoc._id }, { name: 'changed' }, { new: true }).select('thin name docs.name docs.bool');
          assert.equal(findOneAndUpdateDoc.isSelected('name'), true);
          assert.equal(findOneAndUpdateDoc.isSelected('thin'), true);
          assert.equal(findOneAndUpdateDoc.isSelected('docs.name'), true);
          assert.equal(findOneAndUpdateDoc.isSelected('docs.bool'), true);
          assert.equal(findOneAndUpdateDoc.name, 'changed');
          assert.equal(findOneAndUpdateDoc.docs[0].name, 'test');
          assert.ok(findOneAndUpdateDoc.thin);
          assert.ok(findOneAndUpdateDoc.docs[0].bool);
        });
        it('with findOneAndRemove', async function() {
          const findOneAndRemoveDoc = await E.findOneAndRemove({ _id: exclusionDoc._id }).select('-name -docs.name');
          assert.equal(findOneAndRemoveDoc.isSelected('name'), false);
          assert.equal(findOneAndRemoveDoc.isSelected('thin'), true);
          assert.equal(findOneAndRemoveDoc.isSelected('docs.name'), false);
          assert.equal(findOneAndRemoveDoc.isSelected('docs.bool'), true);
          assert.strictEqual(undefined, findOneAndRemoveDoc.name);
          assert.strictEqual(undefined, findOneAndRemoveDoc.docs[0].name);
          assert.strictEqual(true, findOneAndRemoveDoc.thin);
          assert.strictEqual(true, findOneAndRemoveDoc.docs[0].bool);
        });
      });
    });
  });

  describe('exclusion in root schema should override child schema', function() {
    it('works (gh-1333)', function(done) {
      const m = new mongoose.Mongoose();
      const child = new Schema({
        name1: { type: String, select: false },
        name2: { type: String, select: true }
      });
      const selected = new Schema({
        docs: { type: [child], select: false }
      });
      const M = m.model('Test', selected);

      const query = M.findOne();
      query._applyPaths();
      assert.equal(Object.keys(query._fields).length, 1);
      assert.equal(query._fields['docs.name1'], undefined);
      assert.equal(query._fields['docs.name2'], undefined);
      assert.equal(query._fields.docs, 0);
      done();
    });

    it('with nested (gh-7945)', async function() {
      const child = new Schema({
        name1: { type: String, select: false },
        name2: { type: String, select: true }
      });
      const selected = new Schema({
        parent: {
          docs: { type: [child], select: false }
        }
      });
      const M = db.model('Test', selected);

      const query = M.findOne();
      query._applyPaths();
      assert.equal(Object.keys(query._fields).length, 1);
      assert.equal(query._fields['parent.docs.name1'], undefined);
      assert.equal(query._fields['parent.docs.name2'], undefined);
      assert.equal(query._fields['parent.docs'], 0);

      await M.create({ parent: { docs: [{ name1: 'foo', name2: 'bar' }] } });
      const docQuery = await M.findOne();
      assert.ok(!docQuery.parent.docs); // the returned document doesn't have a parent property, don't know if thats a problem since before the refactor it also didn't have it.
    });
  });

  it('should not project in discriminator key if projected in implicitly with .$ (gh-9361)', function() {
    const eventSchema = new Schema({ message: String },
      { discriminatorKey: 'kind', _id: false });

    const batchSchema = new Schema({ events: [eventSchema] });
    batchSchema.path('events').discriminator('Clicked', new Schema({
      element: String
    }, { _id: false }));
    batchSchema.path('events').discriminator('Purchased', new Schema({
      product: String
    }, { _id: false }));

    const MyModel = db.model('Test', batchSchema);

    const query = MyModel.find({ 'events.message': 'foo' }).select({ 'events.$': 1 });
    query._applyPaths();

    assert.equal(Object.keys(query._fields).length, 1);
    assert.ok(query._fields['events.$']);
  });

  describe('forcing inclusion of a deselected schema path', function() {
    it('works', async function() {
      const excluded = new Schema({
        thin: Boolean,
        name: { type: String, select: false },
        docs: [new Schema({ name: { type: String, select: false }, bool: Boolean })]
      });

      const M = db.model('Test', excluded);
      const d = await M.create({
        thin: false,
        name: '1 meter',
        docs: [{ name: 'test', bool: false }]
      });
      let doc = await M.findById(d)
        .select('+name +docs.name')
        .exec();
      assert.equal(doc.thin, false);
      assert.equal(doc.name, '1 meter');
      assert.equal(doc.docs[0].bool, false);
      assert.equal(doc.docs[0].name, 'test');
      assert.equal(d.id, doc.id);

      doc = await M.findById(d)
        .select('+name -thin +docs.name -docs.bool')
        .exec();
      assert.equal(doc.thin, undefined);
      assert.equal(doc.name, '1 meter');
      assert.equal(doc.docs[0].bool, undefined);
      assert.equal(doc.docs[0].name, 'test');
      assert.equal(d.id, doc.id);

      doc = await M.findById(d)
        .select('-thin +name -docs.bool +docs.name')
        .exec();
      assert.equal(doc.thin, undefined);
      assert.equal(doc.name, '1 meter');
      assert.equal(doc.docs[0].bool, undefined);
      assert.equal(doc.docs[0].name, 'test');
      assert.equal(d.id, doc.id);

      doc = await M.findById(d)
        .select('-thin -docs.bool')
        .exec();
      assert.equal(doc.thin, undefined);
      assert.equal(doc.name, undefined);
      assert.equal(doc.docs[0].bool, undefined);
      assert.equal(doc.docs[0].name, undefined);
      assert.equal(d.id, doc.id);
    });

    it('works with query.slice (gh-1370)', async function() {
      const M = db.model('Test', new Schema({ many: { type: [String], select: false } }));

      await M.create({ many: ['1', '2', '3', '4', '5'] });

      const query = M.findOne().select('+many').where('many').slice(2);

      const doc = await query.exec();
      assert.equal(doc.many.length, 2);
    });

    it('ignores if path does not have select in schema (gh-6785)', async function() {
      const M = db.model('Test', new Schema({
        a: String,
        b: String
      }));

      await M.create({ a: 'foo', b: 'bar' });

      const doc = await M.findOne().select('+a');
      assert.equal(doc.a, 'foo');
      assert.equal(doc.b, 'bar');
    });

    it('omits if not in schema (gh-7017)', async function() {
      const M = db.model('Test', new Schema({
        a: { type: String, select: false },
        b: { type: String, select: false }
      }), 'Test');

      await db.$initialConnection;
      await db.collection('Test').insertOne({
        a: 'foo',
        b: 'bar',
        c: 'baz'
      });

      const q = M.find({}).select('+c');
      const doc = await q.then(res => res[0]);
      assert.deepEqual(q._fields, { a: 0, b: 0 });

      assert.strictEqual(doc.a, void 0);
      assert.strictEqual(doc.b, void 0);
      assert.equal(doc.toObject().c, 'baz');
    });
  });

  it('conflicting schematype path selection should not error', async function() {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: true },
      conflict: { type: String, select: false }
    });

    const S = db.model('Test', schema);
    let s = await S.create({ thin: true, name: 'bing', conflict: 'crosby' });
    assert.equal(s.name, 'bing');
    assert.equal(s.conflict, 'crosby');

    s = await S.findById(s).exec();
    assert.equal(s.name, 'bing');
    assert.equal(s.conflict, undefined);

    s = await S.find({ _id: s._id }).exec();
    assert.equal(s[0].name, 'bing');
    assert.equal(s[0].conflict, undefined);
  });

  it('selecting _id works with excluded schematype path', function() {
    const schema = new Schema({
      name: { type: String, select: false }
    });

    const M = db.model('Test', schema);
    return M.find().select('_id').exec();
  });

  it('selecting _id works with excluded schematype path on sub doc', async function() {
    const schema = new Schema({
      docs: [new Schema({ name: { type: String, select: false } })]
    });

    const M = db.model('Test', schema);
    await M.find().select('_id').exec();
  });

  it('inclusive/exclusive combos should work', async function() {
    const coll = 'Test';

    const schema = new Schema({
      name: { type: String },
      age: Number
    }, { collection: coll });
    const M = db.model('Test1', schema);

    const doc = await M.create({ name: 'ssd', age: 0 });
    let d = await M.findOne().select('-_id name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    d = await M.findOne().select('-_id -name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, undefined);
    assert.equal(d.age, 0);
    d = await M.findOne().select('_id name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    try {
      d = await M.findOne().select('age -name');
    } catch (error) {
      assert.ok(error);
    }
    try {
      d = await M.findOne().select('-age name');
    } catch (error) {
      assert.ok(error);
    }
    d = await M.findOne().select('-age -name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, undefined);
    assert.equal(d.age, undefined);
    d = await M.findOne().select('age name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, 0);
  });
  it('when select is false in the schema definition, all inclusive/exclusive combos should work', async function() {
    const coll = 'Test';

    const schema = new Schema({
      name: { type: String },
      age: Number
    }, { collection: coll });
    const M = db.model('Test1', schema);

    const schema1 = new Schema({
      name: { type: String, select: false },
      age: Number
    }, { collection: coll });
    const SelectFalse = db.model('Test2', schema1);
    const doc = await M.create({ name: 'ssd', age: 0 });
    let d = await SelectFalse.findOne().select('-_id name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    d = await SelectFalse.findOne().select('-_id -name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, undefined);
    assert.equal(d.age, 0);
    d = await SelectFalse.findOne().select('_id name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    try {
      d = await SelectFalse.findOne().select('age -name');
    } catch (error) {
      assert.ok(error);
    }
    try {
      d = await SelectFalse.findOne().select('-age name');
    } catch (error) {
      assert.ok(error);
    }
    d = await SelectFalse.findOne().select('-age -name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, undefined);
    assert.equal(d.age, undefined);
    d = await SelectFalse.findOne().select('age name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, 0);

  });
  it('when select is set to true in the schema definition, all inclusive/exclusive combos should work', async function() {
    const coll = 'Test';

    const schema = new Schema({
      name: { type: String },
      age: Number
    }, { collection: coll });
    const M = db.model('Test1', schema);

    const schema2 = new Schema({
      name: { type: String, select: true },
      age: Number
    }, { collection: coll });
    const SelectTrue = db.model('Test3', schema2);

    const doc = await M.create({ name: 'ssd', age: 0 });
    let d = await SelectTrue.findOne().select('-_id name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    d = await SelectTrue.findOne().select('-_id -name');
    assert.equal(d.id, undefined);
    assert.equal(d.name, undefined);
    assert.equal(d.age, 0);
    d = await SelectTrue.findOne().select('_id name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, undefined);
    d = await SelectTrue.findOne().select('age -name');
    assert.equal(d.age, 0);
    assert.equal(d.name, undefined);
    try {
      d = await SelectTrue.findOne().select('-age name');
    } catch (error) {
      assert.ok(error);
    }
    d = await SelectTrue.findOne().select('-age -name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, undefined);
    assert.equal(d.age, undefined);
    d = await SelectTrue.findOne().select('age name');
    assert.equal(d.id, doc.id);
    assert.equal(d.name, 'ssd');
    assert.equal(d.age, 0);
  });

  it('does not set defaults for nested objects (gh-4707)', function(done) {
    const userSchema = new Schema({
      name: String,
      age: Number,
      profile: {
        email: String,
        flags: { type: String, default: 'bacon' }
      }
    });

    const User = db.model('Test', userSchema);

    const obj = {
      name: 'Val',
      age: 28,
      profile: { email: 'test@a.co', flags: 'abc' }
    };
    User.create(obj).
      then(function(user) {
        return User.findById(user._id).
          select('name profile.email');
      }).
      then(function(user) {
        assert.ok(!user.profile.flags);
        done();
      }).
      catch(done);
  });

  it('does not create nested objects if not included (gh-4669)', async function() {
    const schema = new Schema({
      field1: String,
      field2: String,
      field3: {
        f1: String,
        f2: { type: String, default: 'abc' }
      },
      field4: {
        f1: String
      },
      field5: String
    }, { minimize: false });

    const M = db.model('Test', schema);
    const obj = {
      field1: 'a',
      field2: 'b',
      field3: { f1: 'c', f2: 'd' },
      field4: { f1: 'e' },
      field5: 'f'
    };
    let doc = await M.create(obj);
    doc = await M.findOne({ _id: doc._id }, 'field1 field2');
    assert.ok(!doc.toObject({ minimize: false }).field3);
    assert.ok(!doc.toObject({ minimize: false }).field4);
  });

  it('initializes nested defaults with selected objects (gh-2629)', async function() {
    const NestedSchema = new mongoose.Schema({
      nested: {
        name: { type: String, default: 'val' }
      }
    });

    const Model = db.model('Test', NestedSchema);

    let doc = new Model();
    doc.nested.name = undefined;
    await doc.save();
    doc = await Model.findOne({}, { nested: 1 });
    assert.equal(doc.nested.name, 'val');
  });

  it('should allow deselecting a field on a query even if the definition has select set to true (gh-11694)', async function() {
    const testSchema = new mongoose.Schema({
      name: String,
      age: { type: String, select: true }
    });

    const Test = db.model('Test', testSchema);
    const doc = await Test.create({ name: 'Test', age: '42' });
    const result = await Test.findOne({ _id: doc._id }).select('name -age');
    assert.equal(result.name, 'Test');
    assert.equal(result.age, undefined);
  });
});
