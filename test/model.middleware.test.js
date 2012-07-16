
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;


describe('model middleware', function(){
  it('post save', function(done){
    var schema = new Schema({
        title: String
    });

    var called = 0;

    schema.post('save', function (obj) {
      assert.equal(obj.title,'Little Green Running Hood');
      assert.equal(0, called);
      called++;
    });

    schema.post('save', function (obj) {
      assert.equal(obj.title,'Little Green Running Hood');
      assert.equal(1, called);
      called++;
    });

    schema.post('save', function (obj) {
      assert.equal(obj.title,'Little Green Running Hood');
      assert.equal(2, called);
      db.close();
      done();
    });

    var db = start()
      , TestMiddleware = db.model('TestPostSaveMiddleware', schema);

    var test = new TestMiddleware({ title: 'Little Green Running Hood'});

    test.save(function(err){
      assert.ifError(err);
    });
  })

  it('works', function(done){
    var schema = new Schema({
        title: String
    });

    var called = 0;

    schema.pre('init', function (next) {
      called++;
      next();
    });

    schema.pre('save', function (next) {
      called++;
      next(new Error('Error 101'));
    });

    schema.pre('remove', function (next) {
      called++;
      next();
    });

    mongoose.model('TestMiddleware', schema);

    var db = start()
      , TestMiddleware = db.model('TestMiddleware');

    var test = new TestMiddleware();

    test.init({
        title: 'Test'
    });

    assert.equal(1, called);

    test.save(function(err){
      assert.ok(err instanceof Error);
      assert.equal(err.message,'Error 101');
      assert.equal(2, called);

      test.remove(function(err){
        db.close();
        assert.ifError(err);
        assert.equal(3, called);
        done();
      });
    });
  });

  it('post init', function(done){
    var schema = new Schema({
        title: String
    });

    var preinit = 0
      , postinit = 0

    schema.pre('init', function (next) {
      ++preinit;
      next();
    });

    schema.post('init', function () {
      ++postinit;
    });

    mongoose.model('TestPostInitMiddleware', schema);

    var db = start()
      , Test = db.model('TestPostInitMiddleware');

    var test = new Test({ title: "banana" });

    test.save(function(err){
      assert.ifError(err);

      Test.findById(test._id, function (err, test) {
        assert.ifError(err);
        assert.equal(1, preinit);
        assert.equal(1, postinit);
        test.remove(function(err){
          db.close();
          done();
        });
      });
    });
  });
});
