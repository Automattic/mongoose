
/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    Aggregate = require('../lib/aggregate'),
    Schema = mongoose.Schema;

/**
 * Setup.
 */

var userSchema = new Schema({
  name: String,
  age: Number
});

var collection = 'aggregate_' + random();
mongoose.model('Aggregate', userSchema);

describe('model aggregate', function() {
  var group = {$group: {_id: null, maxAge: {$max: '$age'}}};
  var project = {$project: {maxAge: 1, _id: 0}};
  var db, A, maxAge;

  var mongo26_or_greater = false;

  before(function(done) {
    db = start();
    A = db.model('Aggregate', collection);

    var authors = 'guillermo nathan tj damian marco'.split(' ');
    var num = 10;
    var docs = [];
    maxAge = 0;

    for (var i = 0; i < num; ++i) {
      var age = Math.random() * 100 | 0;
      maxAge = Math.max(maxAge, age);
      docs.push({author: authors[i % authors.length], age: age});
    }

    A.create(docs, function(err) {
      assert.ifError(err);
      start.mongodVersion(function(err, version) {
        if (err) throw err;
        mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
        if (!mongo26_or_greater) console.log('not testing mongodb 2.6 features');
        done();
      });
    });
  });

  after(function(done) {
    db.close(done);
  });

  describe('works', function() {
    it('with argument lists', function(done) {
      this.timeout(4000);

      A.aggregate(group, project, function(err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.equal(res.length, 1);
        assert.ok('maxAge' in res[0]);
        assert.equal(res[0].maxAge, maxAge);
        done();
      });
    });

    it('when return promise', function(done) {
      this.timeout(4000);

      A.aggregate(group, project).then( function(res) {
        assert.ok(res);
        assert.equal(1, res.length);
        assert.ok('maxAge' in res[0]);
        assert.equal(maxAge, res[0].maxAge);
        done();
      });
    });

    it('with arrays', function(done) {
      this.timeout(4000);

      A.aggregate([group, project], function(err, res) {
        assert.ifError(err);
        assert.ok(res);
        assert.equal(res.length, 1);
        assert.ok('maxAge' in res[0]);
        assert.equal(res[0].maxAge, maxAge);
        done();
      });
    });

    it('with Aggregate syntax', function(done) {
      this.timeout(4000);

      var promise = A.aggregate()
        .group(group.$group)
        .project(project.$project)
        .exec(function(err, res) {
          assert.ifError(err);
          assert.ok(promise instanceof mongoose.Promise);
          assert.ok(res);
          assert.equal(res.length, 1);
          assert.ok('maxAge' in res[0]);
          assert.equal(res[0].maxAge, maxAge);
          done();
        });
    });

    it('with Aggregate syntax if callback not provided', function(done) {
      this.timeout(4000);

      var promise = A.aggregate()
        .group(group.$group)
        .project(project.$project)
        .exec();

      promise.then(function(res) {
        assert.ok(promise instanceof mongoose.Promise);
        assert.ok(res);
        assert.equal(res.length, 1);
        assert.ok('maxAge' in res[0]);
        assert.equal(maxAge, res[0].maxAge);
        done();
      }).end();
    });

    it('when returning Aggregate', function(done) {
      assert(A.aggregate(project) instanceof Aggregate);
      done();
    });

    it('can use helper for $out', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      this.timeout(4000);

      var outputCollection = 'aggregate_output_' + random();
      A.aggregate()
        .group(group.$group)
        .project(project.$project)
        .out(outputCollection)
        .exec(function(error) {
          assert.ifError(error);
          A.db.collection(outputCollection).find().toArray(function(error, documents) {
            assert.ifError(error);
            assert.equal(documents.length, 1);
            assert.ok('maxAge' in documents[0]);
            assert.equal(maxAge, documents[0].maxAge);
            done();
          });
        });
    });
  });
});
