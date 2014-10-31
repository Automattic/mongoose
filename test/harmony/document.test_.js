var start = require('../common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var ValidationError = require('../../lib/error/validation');
var co = require('co');
var assert = require('assert');

/**
 *  Asynchronous document functions return
 *  [promises](https://www.npmjs.org/package/mpromise), and so are compatible
 *  with the ES6 `yield` keyword and libraries like
 *  [co](https://www.npmjs.org/package/co)
 */
describe('Documents in ES6', function() {
  var db;
  var collectionNameCounter = 0;

  var getCollectionName = function() {
    return 'harmony-documents-validate-' + (++collectionNameCounter);
  };

  beforeEach(function() {
    db = start();
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
        validator: function(str) {
          called = true;
          return shouldSucceed;
        },
        message: 'BAM'
      };

      schema = new Schema({
        eggs: { type: String, required: true, validate: validate },
        bacon: { type: Boolean, required: true }
      });
 
      var M = db.model('validateSchema', schema, getCollectionName());
      var m = new M({ eggs: 'Sunny side up', bacon: false });

      try {
        yield m.validate();
      } catch(e) {
        error = e;
      }

      assert.ok(!error);
      assert.equal(true, called);
      called = false;

      // The validator function above should now fail
      shouldSucceed = false;
      try {
        yield m.validate();
      } catch(e) {
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
        description: { type: String, required: true },
      });

      var Breakfast = db.model('breakfast', schema, getCollectionName());

      var goodBreakfast = new Breakfast({ description: 'eggs & bacon' });

      try {
        yield goodBreakfast.save();
      } catch(e) {
        error = e;
      }

      assert.ifError(error);
      var result;
      try {
        result = yield Breakfast.findOne().exec();
      } catch(e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal('eggs & bacon', result.description);

      // Should cause a validation error because `description` is required
      var badBreakfast = new Breakfast({});
      try {
        yield badBreakfast.save();
      } catch(e) {
        error = e;
      }

      assert.ok(error);
      assert.ok(error instanceof ValidationError);

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
        yield breakfast.update({ steak: 'Ribeye', eggs: 'Scrambled' }, { upsert: true }).exec();
      } catch(e) {
        error = e;
      }

      assert.ifError(error);
      var result;
      try {
        result = yield Breakfast.findOne().exec();
      } catch(e) {
        error = e;
      }
      assert.ifError(error);
      assert.equal(breakfast._id.toString(), result._id.toString());
      assert.equal('Ribeye', result.steak);
      assert.equal('Scrambled', result.eggs);
      done();
    })();
  });
});
