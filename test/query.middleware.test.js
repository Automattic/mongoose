var start = require('./common');
var assert = require('assert');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;

describe('query middleware', function() {
  var db;
  var schema;
  var Author;

  beforeEach(function(done) {
    schema = new Schema({
      title: String,
      author: String
    });

    db = start();

    Author = db.model('gh-2138', schema, 'gh-2138');

    Author.remove({}, function(error) {
      if (error) {
        return done(error);
      }
      var doc = { title: 'Professional AngularJS', author: 'Val' };
      Author.create(doc, function(error) {
        done(error);
      });
    });
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('has a pre find hook', function(done) {
    var count = 0;
    schema.pre('find', function(next) {
      ++count;
      next();
    });

    var db = start();

    Author.find({ x: 1 }, function(error) {
      assert.ifError(error);
      assert.equal(1, count);
      done();
    });
  });

  it('has post find hooks', function(done) {
    var postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(1, results.length);
      assert.equal('Val', results[0].author);
      ++postCount;
      next();
    });

    Author.find({ title: 'Professional AngularJS' }, function(error, docs) {
      assert.ifError(error);
      assert.equal(1, postCount);
      assert.equal(1, docs.length);
      done();
    });
  });

  it('works when using a chained query builder', function(done) {
    var count = 0;
    schema.pre('find', function(next) {
      ++count;
      next();
    });

    var postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(1, results.length);
      assert.equal('Val', results[0].author);
      ++postCount;
      next();
    });

    Author.find({ title: 'Professional AngularJS' }).exec(function(error, docs) {
      assert.ifError(error);
      assert.equal(1, count);
      assert.equal(1, postCount);
      assert.equal(1, docs.length);
      done();
    });
  });

  /*it('has separate pre-findOne() and post-findOne() hooks', function(done) {
    
  });*/
});
