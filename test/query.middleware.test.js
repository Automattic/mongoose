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
        assert.equal(count, 1);
        done();
      });
    });
  });

  it('has post find hooks', function(done) {
    var postCount = 0;
    schema.post('find', function(results, next) {
      assert.equal(results.length, 1);
      assert.equal(results[0].author, 'Val');
      assert.equal(results[0].options, 'bacon');
      ++postCount;
      next();
    });

    initializeData(function(error) {
      assert.ifError(error);
      Author.find({title: 'Professional AngularJS'}, function(error, docs) {
        assert.ifError(error);
        assert.equal(postCount, 1);
        assert.equal(docs.length, 1);
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
      assert.equal(results.length, 1);
      assert.equal(results[0].author, 'Val');
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.find({title: 'Professional AngularJS'}).exec(function(error, docs) {
        assert.ifError(error);
        assert.equal(count, 1);
        assert.equal(postCount, 1);
        assert.equal(docs.length, 1);
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
      assert.equal(result.author, 'Val');
      ++postCount;
      next();
    });

    initializeData(function() {
      Author.findOne({title: 'Professional AngularJS'}).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(count, 1);
        assert.equal(postCount, 1);
        assert.equal(doc.author, 'Val');
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
        assert.equal(doc.author, 'Val');
        assert.equal(doc.publisher.name, 'Wiley');
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
        assert.equal(doc.author, 'Val');
        assert.equal(doc.publisher.name, 'Wiley');
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
      Author.
        find({ title: 'Professional AngularJS' }).
        count(function(error, count) {
          assert.ifError(error);
          assert.equal(1, count);
          assert.equal(1, preCount);
          assert.equal(1, postCount);
          done();
        });
    });
  });

  it('error handlers (gh-2284)', function(done) {
    var testSchema = new Schema({ title: { type: String, unique: true } });

    testSchema.post('update', function(error, res, next) {
      next(new Error('woops'));
    });

    var Book = db.model('gh2284', testSchema);

    Book.on('index', function(error) {
      assert.ifError(error);
      var books = [
        { title: 'Professional AngularJS' },
        { title: 'The 80/20 Guide to ES2015 Generators' }
      ];
      Book.create(books, function(error, books) {
        assert.ifError(error);
        var query = { _id: books[1]._id };
        var update = { title: 'Professional AngularJS' };
        Book.update(query, update, function(error) {
          assert.equal(error.message, 'woops');
          done();
        });
      });
    });
  });
});
