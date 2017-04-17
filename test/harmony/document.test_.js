var start = require('../common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var ValidationError = require('../../lib/error/validation');
var co = require('co');
var assert = require('power-assert');

/**
 *  Asynchronous document functions return
 *  [promises](https://www.npmjs.org/package/mpromise), and so are compatible
 *  with the [ES6 `yield` keyword](http://mzl.la/1gSa8Gu) and libraries like
 *  [co](https://www.npmjs.org/package/co).
 *
 *  Note that the `yield` keyword is currently only supported in NodeJS 0.11.x
 *  with the `--harmony` flag.
 */
describe('Documents in ES6', function() {
  var db;
  var collectionNameCounter = 0;

  var getCollectionName = function() {
    return 'harmony-documents-validate-' + (++collectionNameCounter);
  };

  beforeEach(function() {
    db = start({noErrorListener: 1});
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('validate() integrates with co and the yield keyword', function(done) {
    co(function*() {
      var schema = null;
      var called = false;
      var shouldSucceed = true;
      var error;

      var validate = {
        validator: function() {
          called = true;
          return shouldSucceed;
        },
        message: 'BAM'
      };

      schema = new Schema({
        eggs: {type: String, required: true, validate: validate},
        bacon: {type: Boolean, required: true}
      });

      var M = db.model('validateSchema', schema, getCollectionName());
      var m = new M({eggs: 'Sunny side up', bacon: false});

      try {
        yield m.validate();
      } catch (e) {
        error = e;
      }

      assert.ok(!error);
      assert.equal(called, true);
      called = false;

      // The validator function above should now fail
      shouldSucceed = false;
      try {
        yield m.validate();
      } catch (e) {
        error = e;
      }

      assert.ok(error);
      assert.ok(error instanceof ValidationError);

      done();
    })();
  });

  it('save() integrates with co and the yield keyword', function(done) {
    co(function*() {
      var error;
      var schema = new Schema({
        description: {type: String, required: true}
      });

      var Breakfast = db.model('breakfast', schema, getCollectionName());

      var goodBreakfast = new Breakfast({description: 'eggs & bacon'});

      try {
        yield goodBreakfast.save();
      } catch (e) {
        error = e;
      }

      assert.ifError(error);
      var result;
      try {
        result = yield Breakfast.findOne().exec();
      } catch (e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal(result.description, 'eggs & bacon');

      // Should cause a validation error because `description` is required
      var badBreakfast = new Breakfast({});
      try {
        yield badBreakfast.save();
      } catch (e) {
        error = e;
      }

      assert.ok(error);
      assert.ok(error instanceof ValidationError);

      done();
    })();
  });

  it('populate() *requires* execPopulate() to work with the yield keyword', function(done) {
    /**
     *  Because the `populate()` function supports chaining, it's difficult
     *  to determine when the chain is 'done'. Therefore, you need to call
     *  `execPopulate()` to use `populate()` with `yield`.
     */
    co(function*() {
      var error;
      var breakfastCollectionName = getCollectionName();
      var foodCollectionName = getCollectionName();
      var breakfastSchema = new Schema({
        foods: [{type: mongoose.Schema.ObjectId, ref: foodCollectionName}]
      });

      var foodSchema = new Schema({
        name: String
      });

      var Food = db.model(foodCollectionName, foodSchema, foodCollectionName);
      var Breakfast = db.model(breakfastCollectionName, breakfastSchema, breakfastCollectionName);

      var bacon = new Food({name: 'bacon'});
      var eggs = new Food({name: 'eggs'});
      var goodBreakfast = new Breakfast({foods: [bacon, eggs]});

      try {
        yield [bacon.save(), eggs.save(), goodBreakfast.save()];
      } catch (e) {
        error = e;
      }

      var result;
      try {
        result = yield Breakfast.findOne().exec();
      } catch (e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal(result.foods.length, 2);

      try {
        result = yield result.populate('foods').execPopulate();
      } catch (e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal(result.foods.length, 2);
      assert.equal(result.foods[0].name, 'bacon');
      assert.equal(result.foods[1].name, 'eggs');

      done();
    })();
  });

  it('update() works with co and yield', function(done) {
    co(function*() {
      var schema = new Schema({
        steak: String,
        eggs: String
      });

      var Breakfast = db.model('breakfast', schema, getCollectionName());

      var breakfast = new Breakfast({});
      var error;

      try {
        yield breakfast.update({steak: 'Ribeye', eggs: 'Scrambled'}, {upsert: true}).exec();
      } catch (e) {
        error = e;
      }

      assert.ifError(error);
      var result;
      try {
        result = yield Breakfast.findOne().exec();
      } catch (e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal(breakfast._id.toString(), result._id.toString());
      assert.equal(result.steak, 'Ribeye');
      assert.equal(result.eggs, 'Scrambled');
      done();
    })();
  });
});

