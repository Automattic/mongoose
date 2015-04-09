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
    title: String
});

describe('model', function(){
  describe.only('construct', function(){
    var db;
    var B;
    var calledConstruct, constructCtx;

    before(function(){
      db = start();

      schemaB.construct(function(){
        calledConstruct = true;
        constructCtx = this;
      });

      B = db.model('model-create', schemaB, 'gh-2637-1');
    })

    after(function(done){
      db.close(done);
    })

    it('calls the schema construct method', function(done) {
      var b = new B();
      assert.equal(calledConstruct, true);
      done();
    });

    it('calls the schema construct with the model instance as the context', function(done) {
      var b = new B();
      assert.equal(constructCtx, b);
      done();
    });
  });
})

