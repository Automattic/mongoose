
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Aggregate = require('../lib/aggregate')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ObjectId = Schema.Types.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var userSchema = new Schema({
    name: String
  , age: Number
});

var collection = 'aggregate_' + random();
mongoose.model('Aggregate', userSchema);

describe('model aggregate', function(){
  var group = { $group: { _id: null, maxAge: { $max: '$age' } }}
  var project = { $project: { maxAge: 1, _id: 0 }};
  var db, A, maxAge;

  before(function(done){
    db = start()
    A = db.model('Aggregate', collection)

    var authors = 'guillermo nathan tj damian marco'.split(' ');
    var num = 10;
    var docs = [];
    maxAge = 0;

    for (var i = 0; i< num; ++i) {
      var age = Math.random() * 100 | 0;
      maxAge = Math.max(maxAge, age);
      docs.push({ author: authors[i%authors.length], age: age });
    }

    A.create(docs, function (err) {
      assert.ifError(err);
      done();
    });
  })

  describe('works', function(done){
    it('with argument lists', function(done){
      this.timeout(4000);

      A.aggregate(group, project, function (err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.equal(1, res.length);
        assert.ok('maxAge' in res[0]);
        assert.equal(maxAge, res[0].maxAge);
        done();
      });
    });

    it('with arrays', function(done){
      this.timeout(4000);

      A.aggregate([group, project], function (err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.equal(1, res.length);
        assert.ok('maxAge' in res[0]);
        assert.equal(maxAge, res[0].maxAge);
        done();
      });
    });

    it('with Aggregate syntax', function(done) {
      this.timeout(4000);

      var promise = A.aggregate()
        .group(group.$group)
        .project(project.$project)
        .exec(function (err, res) {
            assert.ifError(err);
            assert.ok(promise instanceof mongoose.Promise);
            assert.ok(res);
            assert.equal(1, res.length);
            assert.ok('maxAge' in res[0]);
            assert.equal(maxAge, res[0].maxAge);
            done();
          });
    });

    it('when returning Aggregate', function(done) {
      assert(A.aggregate(project) instanceof Aggregate);
      done();
    });
  })
});
