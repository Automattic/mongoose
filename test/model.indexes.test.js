
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

describe('model', function(){
  describe('indexes', function(){
    it('are created when model is compiled', function(done){
      var Indexed = new Schema({
          name  : { type: String, index: true }
        , last  : String
        , email : String
        , date  : Date
      });

      Indexed.index({ last: 1, email: 1 }, { unique: true });
      Indexed.index({ date: 1 }, { expires: 10 });

      var db = start()
        , IndexedModel = db.model('IndexedModel', Indexed, 'indexedmodel' + random())
        , assertions = 0;

      IndexedModel.on('index', function(){
        IndexedModel.collection.getIndexes({full:true}, function(err, indexes){
          assert.ifError(err);

          indexes.forEach(function (index) {
            switch (index.name) {
              case '_id_':
              case 'name_1':
              case 'last_1_email_1':
                assertions++;
                break;
              case 'date_1':
                assertions++;
                assert.equal(index.expiresAfterSeconds, 10);
                break;
            }
          });

          db.close();
          assert.equal(4, assertions);
          done();
        });
      });
    });

    it('of embedded documents', function(done){
      var BlogPosts = new Schema({
          _id     : { type: ObjectId, index: true }
        , title   : { type: String, index: true }
        , desc    : String
      });

      var User = new Schema({
          name        : { type: String, index: true }
        , blogposts   : [BlogPosts]
      });

      var db = start()
        , UserModel = db.model('DeepIndexedModel', User, 'deepindexedmodel' + random())
        , assertions = 0;

      UserModel.on('index', function () {
        UserModel.collection.getIndexes(function (err, indexes) {
          assert.ifError(err);

          for (var i in indexes) {
            indexes[i].forEach(function(index){
              if (index[0] == 'name')
                assertions++;
              if (index[0] == 'blogposts._id')
                assertions++;
              if (index[0] == 'blogposts.title')
                assertions++;
            });
          }

          db.close();
          assert.equal(3, assertions);
          done();
        });
      });
    });

    it('compound: on embedded docs', function(done){
      var BlogPosts = new Schema({
          title   : String
        , desc    : String
      });

      BlogPosts.index({ title: 1, desc: 1 });

      var User = new Schema({
          name        : { type: String, index: true }
        , blogposts   : [BlogPosts]
      });

      var db = start()
        , UserModel = db.model('DeepCompoundIndexModel', User, 'deepcompoundindexmodel' + random())
        , found = 0;

      UserModel.on('index', function () {
        UserModel.collection.getIndexes(function (err, indexes) {
          assert.ifError(err);

          for (var index in indexes) {
            switch (index) {
              case 'name_1':
              case 'blogposts.title_1_blogposts.desc_1':
                ++found;
                break;
            }
          }

          db.close();
          assert.equal(2, found);
          done();
        });
      });
    });

    it('error should emit on the model', function(done){
      var db = start();

      var schema = new Schema({ name: { type: String } })
        , Test = db.model('IndexError', schema, "x"+random());

      Test.on('index', function (err) {
        db.close();
        assert.ok(/^E11000 duplicate key error index:/.test(err.message), err);
        done();
      });

      Test.create({ name: 'hi' }, { name: 'hi' }, function (err) {
        assert.strictEqual(err, null);
        Test.schema.index({ name: 1 }, { unique: true });
        Test.schema.index({ other: 1 });
        Test.init();
      });
    });

    describe('auto creation', function(){
      it('can be disabled', function(done){
        var db = start();
        var schema = new Schema({ name: { type: String, index: true }})
        schema.set('autoIndex', false);

        var Test = db.model('AutoIndexing', schema, "x"+random());
        Test.on('index', function(err){
          assert.ok(false, 'Model.ensureIndexes() was called');
        });

        setTimeout(function () {
          Test.collection.getIndexes(function(err, indexes){
            assert.ifError(err);
            assert.equal(0, Object.keys(indexes).length);
            done();
          });
        }, 100);
      })
    })

    it('can be manually triggered', function(done){
      var db = start();
      var schema = new Schema({ name: { type: String } })
        , Test = db.model('ManualIndexing', schema, "x"+random());

      assert.equal('function', typeof Test.ensureIndexes);

      Test.schema.index({ name: 1 }, { sparse: true });

      var called = false;
      Test.on('index', function(err){
        called= true;
      });

      Test.ensureIndexes(function (err) {
        assert.ifError(err);
        assert.ok(called);
        done();
      });
    })
  });
});
