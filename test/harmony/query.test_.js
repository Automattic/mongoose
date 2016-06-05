var start = require('../common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var co = require('co');
var assert = require('power-assert');

/**
 *  Mongoose queries' .exec() function returns a
 *  [promise](https://www.npmjs.org/package/mpromise), and so its compatible
 *  with the [ES6 `yield` keyword](http://mzl.la/1gSa8Gu) and libraries like
 *  [co](https://www.npmjs.org/package/co).
 *
 *  Note that the `yield` keyword is currently only supported in NodeJS 0.11.x
 *  with the `--harmony` flag.
 */
describe('Queries in ES6', function() {
  var db;
  var collectionNameCounter = 0;

  var getCollectionName = function() {
    return 'harmony-queries' + (++collectionNameCounter);
  };

  beforeEach(function() {
    db = start();
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('`exec()` integrates with co and the yield keyword', function(done) {
    co(function*() {
      var schema = new Schema({
        eggs: {type: Number, required: true},
        bacon: {type: Number, required: true}
      });

      var Breakfast = db.model('BreakfastHarmony', schema, getCollectionName());

      try {
        yield Breakfast.create(
          {eggs: 4, bacon: 2},
          {eggs: 3, bacon: 3},
          {eggs: 2, bacon: 4});
      } catch (e) {
        return done(e);
      }

      var result;
      try {
        result = yield Breakfast.findOne({eggs: 4}).exec();
      } catch (e) {
        return done(e);
      }

      assert.equal(result.bacon, 2);

      var results;
      try {
        results = yield Breakfast.find({eggs: {$gt: 2}}).sort({bacon: 1}).exec();
      } catch (e) {
        return done(e);
      }

      assert.equal(results.length, 2);
      assert.equal(results[0].bacon, 2);
      assert.equal(results[1].bacon, 3);

      var count;
      try {
        count = yield Breakfast.count({eggs: {$gt: 2}}).exec();
      } catch (e) {
        return done(e);
      }

      assert.equal(count, 2);

      done();
    })();
  });

  it('can call `populate()` with `exec()`', function(done) {
    co(function*() {
      var bookSchema = new Schema({
        author: {type: mongoose.Schema.ObjectId, ref: 'AuthorHarmony'},
        title: String
      });

      var authorSchema = new Schema({
        name: String
      });

      var Book = db.model('BookHarmony', bookSchema, getCollectionName());
      var Author = db.model('AuthorHarmony', authorSchema, getCollectionName());

      try {
        var hugo = yield Author.create({name: 'Victor Hugo'});
        yield Book.create({author: hugo._id, title: 'Les Miserables'});
      } catch (e) {
        return done(e);
      }

      var result;
      try {
        result = yield Book.findOne({title: 'Les Miserables'}).populate('author').exec();
      } catch (e) {
        return done(e);
      }

      assert.equal(result.author.name, 'Victor Hugo');

      done();
    })();
  });
});

