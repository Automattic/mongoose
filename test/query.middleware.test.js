var start = require('./common');
var assert = require('power-assert');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;

describe('query middleware', function() {
  var db;
  var schema;
  var publisherSchema;
  var Author;
  var Publisher;

  var initializeData = function(done) {
    Author = db.model('gh-2138', schema, 'gh-2138');
    Publisher = db.model('gh-2138-1', publisherSchema, 'gh-2138-1');

    Author.remove({}, function(error) {
      if (error) {
        return done(error);
      }

      Publisher.remove({}, function(error) {
        if (error) {
          return done(error);
        }
        Publisher.create({name: 'Wiley'}, function(error, publisher) {
          if (error) {
            return done(error);
          }

          var doc = {
            title: 'Professional AngularJS',
            author: 'Val',
            publisher: publisher._id,
            options: 'bacon'
          };

          Author.create(doc, function(error) {
            done(error);
          });
        });
      });
    });
  };

  beforeEach(function(done) {
    schema = new Schema({
      title: String,
      author: String,
      publisher: {type: Schema.ObjectId, ref: 'gh-2138-1'},
      options: String
    });

    publisherSchema = new Schema({
      name: String
    });

    db = start();

    done();
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

    start();

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({x: 1}, function(error) {
        assert.ifError(error);
        assert.equal(1, count);
        done();
      });
    });
  });

  it('has post find hooks', function(done) {
    var postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(1, results.length);
      assert.equal('Val', results[0].author);
      assert.equal('bacon', results[0].options);
      ++postCount;
      next();
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({title: 'Professional AngularJS'}, function(error, docs) {
        assert.ifError(error);
        assert.equal(1, postCount);
        assert.equal(1, docs.length);
        done();
      });
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

    initializeData(function() {
      Author.find({title: 'Professional AngularJS'}).exec(function(error, docs) {
        assert.ifError(error);
        assert.equal(1, count);
        assert.equal(1, postCount);
        assert.equal(1, docs.length);
        done();
      });
    });
  });

  it('has separate pre-findOne() and post-findOne() hooks', function(done) {
    var count = 0;
    schema.pre('findOne', function(next) {
      ++count;
      next();
    });

    var postCount = 0;
    schema.post('findOne', function(result, next) {
      assert.equal('Val', result.author);
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.findOne({title: 'Professional AngularJS'}).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(1, count);
        assert.equal(1, postCount);
        assert.equal('Val', doc.author);
        done();
      });
    });
  });

  it('can populate in pre hook', function(done) {
    schema.pre('findOne', function(next) {
      this.populate('publisher');
      next();
    });

    initializeData(function() {
      Author.findOne({title: 'Professional AngularJS'}).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal('Val', doc.author);
        assert.equal('Wiley', doc.publisher.name);
        done();
      });
    });
  });

  it('can populate in post hook', function(done) {
    schema.post('findOne', function(doc, next) {
      doc.populate('publisher', function(error) {
        next(error);
      });
    });

    initializeData(function() {
      Author.findOne({title: 'Professional AngularJS'}).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal('Val', doc.author);
        assert.equal('Wiley', doc.publisher.name);
        done();
      });
    });
  });

  it('has hooks for count()', function(done) {
    var preCount = 0;
    var postCount = 0;

    schema.pre('count', function() {
      ++preCount;
    });

    schema.post('count', function() {
      ++postCount;
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({title: 'Professional AngularJS'}).count(function(error, count) {
        assert.ifError(error);
        assert.equal(1, count);
        assert.equal(1, preCount);
        assert.equal(1, postCount);
        done();
      });
    });
  });
});
