'use strict';

/**
 * Tests for `Document.prototype.$revert()`.
 * Closes: https://github.com/Automattic/mongoose/issues/8714
 *
 * `$revert()` restores a document to the state it was in when last loaded
 * from the database or last saved, discarding any unsaved modifications.
 */

const start = require('./common');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('document: $revert()', function() {
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

  describe('full revert', function() {
    it('restores a top-level scalar field to its original DB value', async function() {
      const schema = new Schema({ name: String, score: Number });
      const Model = db.model('Test', schema);

      const doc = await Model.create({ name: 'Alice', score: 10 });
      const found = await Model.findById(doc._id);

      found.name = 'Modified';
      found.score = 999;
      assert.equal(found.name, 'Modified');
      assert.ok(found.$isModified('name'));
      assert.ok(found.$isModified('score'));

      found.$revert();

      assert.equal(found.name, 'Alice');
      assert.equal(found.score, 10);
      assert.ok(!found.$isModified('name'));
      assert.ok(!found.$isModified('score'));
    });

    it('clears all modified paths after revert', async function() {
      const schema = new Schema({ a: String, b: String, c: Number });
      const Model = db.model('Test', schema);

      await Model.create({ a: 'a', b: 'b', c: 1 });
      const doc = await Model.findOne({ a: 'a' });

      doc.a = 'A';
      doc.b = 'B';
      doc.c = 100;
      assert.deepEqual(doc.directModifiedPaths().sort(), ['a', 'b', 'c']);

      doc.$revert();

      assert.equal(doc.directModifiedPaths().length, 0);
      assert.equal(doc.a, 'a');
      assert.equal(doc.b, 'b');
      assert.equal(doc.c, 1);
    });

    it('removes keys added after load', async function() {
      const schema = new Schema({ name: String }, { strict: false });
      const Model = db.model('Test', schema);

      await Model.create({ name: 'Bob' });
      const doc = await Model.findOne({ name: 'Bob' });

      doc._doc.extraKey = 'should be removed';
      assert.equal(doc._doc.extraKey, 'should be removed');

      doc.$revert();

      assert.equal(doc._doc.extraKey, undefined);
    });

    it('is a no-op on a new (unsaved) document', function() {
      const schema = new Schema({ name: String });
      const Model = db.model('Test', schema);

      const doc = new Model({ name: 'New' });
      // No _originalDoc — revert should be harmless
      doc.name = 'Modified';
      doc.$revert(); // should not throw
      // Value is unchanged since there's nothing to revert to
      assert.equal(doc.name, 'Modified');
    });

    it('does not affect other documents', async function() {
      const schema = new Schema({ val: Number });
      const Model = db.model('Test', schema);

      await Model.create([{ val: 1 }, { val: 2 }]);
      const [doc1, doc2] = await Model.find().sort('val');

      doc1.val = 100;
      doc2.val = 200;

      doc1.$revert();

      assert.equal(doc1.val, 1);
      assert.equal(doc2.val, 200); // untouched
    });
  });

  describe('partial revert (with paths)', function() {
    it('reverts only the specified path', async function() {
      const schema = new Schema({ name: String, age: Number });
      const Model = db.model('Test', schema);

      await Model.create({ name: 'Carol', age: 30 });
      const doc = await Model.findOne({ name: 'Carol' });

      doc.name = 'changed';
      doc.age = 99;

      doc.$revert(['name']);

      assert.equal(doc.name, 'Carol');   // reverted
      assert.equal(doc.age, 99);         // NOT reverted
      assert.ok(!doc.$isModified('name'));
      assert.ok(doc.$isModified('age'));
    });

    it('accepts a string (single path) instead of array', async function() {
      const schema = new Schema({ x: String, y: String });
      const Model = db.model('Test', schema);

      await Model.create({ x: 'orig-x', y: 'orig-y' });
      const doc = await Model.findOne();

      doc.x = 'new-x';
      doc.y = 'new-y';

      doc.$revert('x');

      assert.equal(doc.x, 'orig-x');  // reverted
      assert.equal(doc.y, 'new-y');   // unchanged
    });

    it('reverts multiple specified paths', async function() {
      const schema = new Schema({ a: String, b: String, c: String });
      const Model = db.model('Test', schema);

      await Model.create({ a: 'a0', b: 'b0', c: 'c0' });
      const doc = await Model.findOne();

      doc.a = 'a1';
      doc.b = 'b1';
      doc.c = 'c1';

      doc.$revert(['a', 'b']);

      assert.equal(doc.a, 'a0');
      assert.equal(doc.b, 'b0');
      assert.equal(doc.c, 'c1');  // not reverted
    });
  });

  describe('after save', function() {
    it('snapshot is refreshed so $revert() reflects the newly saved state', async function() {
      const schema = new Schema({ name: String });
      const Model = db.model('Test', schema);

      const doc = await Model.create({ name: 'David' });
      const found = await Model.findById(doc._id);

      // First save: change name and save
      found.name = 'David-v2';
      await found.save();

      // Now revert — should go back to 'David-v2', not 'David'
      found.name = 'David-v3';
      found.$revert();

      assert.equal(found.name, 'David-v2');
      assert.ok(!found.$isModified('name'));
    });
  });

  describe('nested paths', function() {
    it('reverts a nested field', async function() {
      const schema = new Schema({ address: { city: String, zip: String } });
      const Model = db.model('Test', schema);

      await Model.create({ address: { city: 'NYC', zip: '10001' } });
      const doc = await Model.findOne();

      doc.address.city = 'LA';
      doc.address.zip = '90001';
      assert.ok(doc.$isModified('address'));

      doc.$revert();

      assert.equal(doc.address.city, 'NYC');
      assert.equal(doc.address.zip, '10001');
      assert.ok(!doc.$isModified('address'));
    });
  });
});
