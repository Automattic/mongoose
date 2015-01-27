/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , DocumentObjectId = mongoose.Types.ObjectId

/**
 * Setup
 */

var schemaB = Schema({
    title: String,
    type: String
}, {discriminatorKey: 'type'});

var schemaC = Schema({
  test: {
    type: String,
    default: 'test'
  }
}, {discriminatorKey: 'type'});


describe('model', function(){
  describe('hydrate()', function(){
    var db;
    var B;

    before(function(){
      db = start();
      B = db.model('model-create', schemaB, 'model-create-'+random());
      B.discriminator('C', schemaC);
    })

    after(function(done){
      db.close(done);
    })

    it('hydrates documents with no modified paths', function(done){
      var hydrated = B.hydrate({ _id: '541085faedb2f28965d0e8e7', title: 'chair' });

      assert.ok(hydrated.get('_id') instanceof DocumentObjectId);
      assert.equal(hydrated.title, 'chair');

      assert.equal(hydrated.isNew, false);
      assert.equal(hydrated.isModified(), false);
      assert.equal(hydrated.isModified('title'), false);

      done();
    });

    it('works correctly with model discriminators', function(done) {
      var hydrated = B.hydrate({_id: '541085faedb2f28965d0e8e8', title: 'chair', type: 'C'});

      assert.equal(hydrated.test, 'test');
      assert.ok(hydrated.schema === schemaC);
      done();
    });
  });
})
