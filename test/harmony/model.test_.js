/* global emit */
var start = require('../common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var co = require('co');
var assert = require('power-assert');

/**
 *  Asynchronous functions on Model return
 *  [promises](https://www.npmjs.org/package/mpromise), and so are compatible
 *  with the [ES6 `yield` keyword](http://mzl.la/1gSa8Gu) and libraries like
 *  [co](https://www.npmjs.org/package/co).
 *
 *  Note that the functions `find()`, `findOne()`, `findById()`, `count()`,
 *  `findOneAndUpdate()`, `remove()`, `distinct()`, `findByIdAndUpdate()`,
 *  `findOneAndRemove()`, `update()`, and `findByIdAndRemove()` return *Query*
 *  objects, and so you need to use `.exec()` to use these functions with
 *  `yield` as described above.
 *
 */
describe('Models in ES6', function() {
  var db;
  var collectionNameCounter = 0;

  var getCollectionName = function() {
    return 'harmony-models-validate-' + (++collectionNameCounter);
  };

  beforeEach(function() {
    db = start();
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('`create()` integrates with co and the yield keyword', function(done) {
    co(function * () {
      var schema = new Schema({
        eggs: {type: String, required: true},
        bacon: {type: Boolean, required: true}
      });

      var M = db.model('harmonyCreate', schema, getCollectionName());

      var results;
      try {
        results = yield M.create([
          {eggs: 'sunny-side up', bacon: false},
          {eggs: 'scrambled', bacon: true}]);
      } catch (e) {
        return done(e);
      }

      assert.equal(results.length, 2);
      assert.equal(results[0].eggs, 'sunny-side up');
      assert.equal(results[1].eggs, 'scrambled');

      done();
    })();
  });

  it('`aggregate()` integrates with co and the yield keyword', function(done) {
    co(function*() {
      var schema = new Schema({
        eggs: {type: String, required: true},
        bacon: {type: Boolean, required: true}
      });

      var M = db.model('harmonyAggregate', schema, getCollectionName());

      try {
        yield M.create([
          {eggs: 'sunny-side up', bacon: false},
          {eggs: 'scrambled', bacon: true}]);
      } catch (e) {
        return done(e);
      }

      var results;
      try {
        results = yield M.aggregate([
          {$group: {_id: '$bacon', eggs: {$first: '$eggs'}}},
          {$sort: {_id: 1}}
        ]).exec();
      } catch (e) {
        return done(e);
      }

      assert.equal(results.length, 2);
      assert.equal(results[0]._id, false);
      assert.equal(results[0].eggs, 'sunny-side up');
      assert.equal(results[1]._id, true);
      assert.equal(results[1].eggs, 'scrambled');

      done();
    })();
  });

  it('`mapReduce()` can also be used with co and yield', function(done) {
    co(function*() {
      var schema = new Schema({
        eggs: {type: String, required: true},
        bacon: {type: Boolean, required: true}
      });

      var M = db.model('harmonyMapreduce', schema, getCollectionName());

      try {
        yield M.create([
          {eggs: 'sunny-side up', bacon: false},
          {eggs: 'sunny-side up', bacon: true},
          {eggs: 'scrambled', bacon: true}]);
      } catch (e) {
        return done(e);
      }

      var results;
      try {
        results = yield M.mapReduce({
          map: function() { emit(this.eggs, 1); },
          reduce: function(k, vals) { return vals.length; }
        });
      } catch (e) {
        return done(e);
      }

      assert.equal(results.length, 2);
      assert.ok(results[0]._id === 'sunny-side up' || results[1]._id === 'sunny-side up');
      assert.ok(results[0]._id === 'scrambled' || results[1]._id === 'scrambled');

      done();
    })();
  });
});

