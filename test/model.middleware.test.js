
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
  , ObjectId = Schema.Types.ObjectId
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
      assert.equal(obj.title, 'Little Green Running Hood');
      assert.equal(this.title, 'Little Green Running Hood');
      assert.equal(0, called);
      called++;
    });

    schema.post('save', function (obj) {
      assert.equal(obj.title, 'Little Green Running Hood');
      assert.equal(this.title, 'Little Green Running Hood');
      assert.equal(1, called);
      called++;
    });

    schema.post('save', function(obj, next){
      setTimeout(function(){
        assert.equal(obj.title, 'Little Green Running Hood');
        assert.equal(2, called);
        called++;
        next();
      }, 0);
    });

    var db = start()
      , TestMiddleware = db.model('TestPostSaveMiddleware', schema);

    var test = new TestMiddleware({ title: 'Little Green Running Hood'});

    test.save(function(err){
      assert.ifError(err);
      assert.equal(test.title,'Little Green Running Hood');
      assert.equal(3, called);
      db.close();
      done();
    });
  });

  it('validate middleware runs before save middleware (gh-2462)', function(done) {
    var schema = new Schema({
      title: String
    });
    var count = 0;

    schema.pre('validate', function(next) {
      assert.equal(0, count++);
      next();
    });

    schema.pre('save', function(next) {
      assert.equal(1, count++);
      next();
    });

    var db = start();
    var Book = db.model('gh2462', schema);

    Book.create({}, function(err) {
      assert.equal(count, 2);
      db.close(done);
    });
  });

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

    schema.post('init', function (doc) {
      assert.ok(doc instanceof mongoose.Document);
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

  it('gh-1829', function(done) {
    var childSchema = new mongoose.Schema({
      name: String,
    });

    var childPreCalls = 0;
    var childPreCallsByName = {};
    var parentPreCalls = 0;

    childSchema.pre('save', function(next) {
      childPreCallsByName[this.name] = childPreCallsByName[this.name] || 0;
      ++childPreCallsByName[this.name];
      ++childPreCalls;
      next();
    });

    var parentSchema = new mongoose.Schema({
      name: String,
      children: [childSchema],
    });

    parentSchema.pre('save', function(next) {
      ++parentPreCalls;
      next();
    });

    var db = start();
    var Parent = db.model('gh-1829', parentSchema, 'gh-1829');

    var parent = new Parent({
      name: 'Han',
      children: [
        { name: 'Jaina' },
        { name: 'Jacen' }
      ]
    });

    parent.save(function(error) {
      assert.ifError(error);
      assert.equal(2, childPreCalls);
      assert.equal(1, childPreCallsByName['Jaina']);
      assert.equal(1, childPreCallsByName['Jacen']);
      assert.equal(1, parentPreCalls);
      parent.children[0].name = 'Anakin';
      parent.save(function(error) {
        assert.ifError(error);
        assert.equal(4, childPreCalls);
        assert.equal(1, childPreCallsByName['Anakin']);
        assert.equal(1, childPreCallsByName['Jaina']);
        assert.equal(2, childPreCallsByName['Jacen']);

        assert.equal(2, parentPreCalls);
        db.close();
        done();
      });
    });
  });

  it('validate + remove', function(done){
    var schema = new Schema({
        title: String
    });

    var preValidate = 0
      , postValidate = 0
      , preRemove = 0
      , postRemove = 0

    schema.pre('validate', function (next) {
      ++preValidate;
      next();
    });

    schema.pre('remove', function (next) {
      ++preRemove;
      next();
    });

    schema.post('validate', function (doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postValidate;
    });

    schema.post('remove', function (doc) {
      assert.ok(doc instanceof mongoose.Document);
      ++postRemove;
    });

    var db = start()
      , Test = db.model('TestPostValidateMiddleware', schema);

    var test = new Test({ title: "banana" });

    test.save(function(err){
      assert.ifError(err);
      assert.equal(1, preValidate);
      assert.equal(1, postValidate);
      assert.equal(0, preRemove);
      assert.equal(0, postRemove);
      test.remove(function (err) {
        db.close();
        assert.ifError(err);
        assert.equal(1, preValidate);
        assert.equal(1, postValidate);
        assert.equal(1, preRemove);
        assert.equal(1, postRemove);
        done();
      })
    });
  })
});
