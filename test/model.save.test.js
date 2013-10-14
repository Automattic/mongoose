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

var schema = Schema({
  title: String
})


describe('model', function () {
  describe('save()', function () {
    var db;
    var B;

    before(function () {
      db = start();
      B = db.model('model-create', schema, 'model-create-' + random());
    });

    after(function (done) {
      db.close(done);
    });

    it('handle exception in user callback gh-1662', function (done) {
      var schema = new mongoose.Schema({"name": String}, {"capped": true, "collection": "bugDemo", "capped": {"size": 2048, "max": 3}, "strict": false});
      var Bug = db.model('Bug', schema);

      Bug.db.on('error', function(err) {
        assert.equal(1, preException, "Code run once before throwing");
        assert.equal(0, postException, "Code never run after throwing");
        assert.ok(err);
        done();
      });

      var preException = 0, postException = 0;
      var b = Bug.create([{name: "MongoDb1"}, {name: "MongoDb2"}, {name: "MongoDb3"}], function (e, r) {
        if (e) return console.error(e);

        var stream = Bug.find().tailable().stream();

        return stream.on('data', function (doc) {
          preException++;
          console.log(dies); // It dies here
          postException++;
        });

      });
    });

  });
})
