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
    }, {discriminatorKey: 'type'});

    schemaC = new Schema({
      test: {
        type: String,
        default: 'test'
      }
    }, {discriminatorKey: 'type'});
  });

  describe('hydrate()', function() {
    let db;
    let B;
    let Breakfast;

    let breakfastSchema;

    before(function() {
      breakfastSchema = new Schema({
        food: {type: String, enum: ['bacon', 'eggs']}
      });

      db = start();
      B = db.model('model-create', schemaB, 'gh-2637-1');
      B.discriminator('C', schemaC);
      Breakfast = db.model('gh-2637-2', breakfastSchema, 'gh-2637-2');

      return db;
    });

    after(function(done) {
      db.close(done);
    });

    it('hydrates documents with no modified paths', function(done) {
      const hydrated = B.hydrate({_id: '541085faedb2f28965d0e8e7', title: 'chair'});

      assert.ok(hydrated.get('_id') instanceof DocumentObjectId);
      assert.equal(hydrated.title, 'chair');

      assert.equal(hydrated.isNew, false);
      assert.equal(hydrated.isModified(), false);
      assert.equal(hydrated.isModified('title'), false);

      done();
    });

    it('runs validators', function(done) {
      const hydrated = Breakfast.hydrate({
        _id: '000000000000000000000001',
        food: 'waffles'
      });

      hydrated.validate(function(err) {
        assert.ok(err);
        assert.ok(err.errors.food);
        assert.deepEqual(['food'], Object.keys(err.errors));
        done();
      });
    });

    it('works correctly with model discriminators', function(done) {
      const hydrated = B.hydrate({_id: '541085faedb2f28965d0e8e8', title: 'chair', type: 'C'});

      assert.equal(hydrated.test, 'test');
      assert.deepEqual(hydrated.schema.tree, schemaC.tree);
      done();
    });
  });
});
