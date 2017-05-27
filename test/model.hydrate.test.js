/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    DocumentObjectId = mongoose.Types.ObjectId;

describe('model', function() {
  var schemaB;
  var schemaC;

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
    var db;
    var B;
    var Breakfast;

    var breakfastSchema;

    before(function() {
      breakfastSchema = new Schema({
        food: {type: String, enum: ['bacon', 'eggs']}
      });

      db = start();
      B = db.model('model-create', schemaB, 'gh-2637-1');
      B.discriminator('C', schemaC);
      Breakfast = db.model('gh-2637-2', breakfastSchema, 'gh-2637-2');
    });

    after(function(done) {
      db.close(done);
    });

    it('hydrates documents with no modified paths', function(done) {
      var hydrated = B.hydrate({_id: '541085faedb2f28965d0e8e7', title: 'chair'});

      assert.ok(hydrated.get('_id') instanceof DocumentObjectId);
      assert.equal(hydrated.title, 'chair');

      assert.equal(hydrated.isNew, false);
      assert.equal(hydrated.isModified(), false);
      assert.equal(hydrated.isModified('title'), false);

      done();
    });

    it('runs validators', function(done) {
      var hydrated = Breakfast.hydrate({
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
      var hydrated = B.hydrate({_id: '541085faedb2f28965d0e8e8', title: 'chair', type: 'C'});

      assert.equal(hydrated.test, 'test');
      assert.deepEqual(hydrated.schema, schemaC);
      done();
    });
  });
});
