/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model', function() {
  let schemaB;
  let schemaC;

  before(function() {
    schemaB = new Schema({
      title: String,
      type: String
    }, { discriminatorKey: 'type' });

    schemaC = new Schema({
      test: {
        type: String,
        default: 'test'
      }
    }, { discriminatorKey: 'type' });
  });

  describe('hydrate()', function() {
    let db;
    let B;
    let C;
    let Breakfast;

    let breakfastSchema;

    before(function() {
      breakfastSchema = new Schema({
        food: { type: String, enum: ['bacon', 'eggs'] }
      });

      db = start();
      B = db.model('Test', schemaB);
      C = B.discriminator('C', schemaC);
      Breakfast = db.model('Test1', breakfastSchema);

      return db;
    });

    after(async function() {
      await db.close();
    });

    it('hydrates documents with no modified paths', function() {
      const hydrated = B.hydrate({ _id: '541085faedb2f28965d0e8e7', title: 'chair' });

      assert.ok(hydrated.get('_id') instanceof DocumentObjectId);
      assert.equal(hydrated.title, 'chair');

      assert.equal(hydrated.isNew, false);
      assert.equal(hydrated.isModified(), false);
      assert.equal(hydrated.isModified('title'), false);
    });

    it('runs validators', async function() {
      const hydrated = Breakfast.hydrate({
        _id: '000000000000000000000001',
        food: 'waffles'
      });

      const err = await hydrated.validate().then(() => null, err => err);

      assert.ok(err);
      assert.ok(err.errors.food);
      assert.deepEqual(['food'], Object.keys(err.errors));
    });

    it('supports projection (gh-9209)', function() {
      const schema = new Schema({
        prop: String,
        arr: [String]
      });
      const Model = db.model('Test2', schema);

      const doc = Model.hydrate({ prop: 'test' }, { arr: 0 });

      assert.equal(doc.isNew, false);
      assert.equal(doc.isModified(), false);
      assert.ok(!doc.$__delta());
    });

    it('works correctly with model discriminators', function() {
      const hydrated = B.hydrate({ _id: '541085faedb2f28965d0e8e8', title: 'chair', type: 'C' });

      assert.equal(hydrated.test, 'test');
      assert.deepEqual(hydrated.schema.tree, C.schema.tree);
    });
  });
});
