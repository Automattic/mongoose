/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

describe('model', function() {
  var db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('indexes', function() {
    it('are created when model is compiled', function(done) {
      var Indexed = new Schema({
        name: {type: String, index: true},
        last: String,
        email: String,
        date: Date
      });

      Indexed.index({last: 1, email: 1}, {unique: true});
      Indexed.index({date: 1}, {expires: 10});

      var IndexedModel = db.model('IndexedModel1', Indexed, 'indexedmodel' + random());
      var assertions = 0;

      IndexedModel.on('index', function() {
        IndexedModel.collection.getIndexes({full: true}, function(err, indexes) {
          assert.ifError(err);

          indexes.forEach(function(index) {
            switch (index.name) {
              case '_id_':
              case 'name_1':
              case 'last_1_email_1':
                assertions++;
                break;
              case 'date_1':
                assertions++;
                assert.equal(index.expireAfterSeconds, 10);
                break;
            }
          });

          assert.equal(assertions, 4);
          done();
        });
      });
    });

    it('of embedded documents', function(done) {
      var BlogPosts = new Schema({
        _id: {type: ObjectId, index: true},
        title: {type: String, index: true},
        desc: String
      });

      var User = new Schema({
        name: {type: String, index: true},
        blogposts: [BlogPosts]
      });

      var UserModel = db.model('DeepIndexedModel2', User, 'deepindexedmodel' + random());
      var assertions = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          function iter(index) {
            if (index[0] === 'name') {
              assertions++;
            }
            if (index[0] === 'blogposts._id') {
              assertions++;
            }
            if (index[0] === 'blogposts.title') {
              assertions++;
            }
          }

          for (var i in indexes) {
            indexes[i].forEach(iter);
          }

          assert.equal(assertions, 3);
          done();
        });
      });
    });

    it('of embedded documents unless excludeIndexes (gh-5575)', function(done) {
      var BlogPost = new Schema({
        _id: {type: ObjectId},
        title: {type: String, index: true},
        desc: String
      });

      var User = new Schema({
        name: {type: String, index: true},
        blogposts: {
          type: [BlogPost],
          excludeIndexes: true
        },
        otherblogposts: [{ type: BlogPost, excludeIndexes: true }],
        blogpost: {
          type: BlogPost,
          excludeIndexes: true
        }
      });

      var UserModel = db.model('gh5575', User);

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          // Should only have _id and name indexes
          var indexNames = Object.keys(indexes);
          assert.deepEqual(indexNames.sort(), ['_id_', 'name_1']);
          done();
        });
      });
    });

    it('of multiple embedded documents with same schema', function(done) {
      var BlogPosts = new Schema({
        _id: {type: ObjectId, index: true},
        title: {type: String, index: true},
        desc: String
      });

      var User = new Schema({
        name: {type: String, index: true},
        blogposts: [BlogPosts],
        featured: [BlogPosts]
      });

      var UserModel = db.model('DeepIndexedModelMulti3', User, 'gh2322');
      var assertions = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          function iter(index) {
            if (index[0] === 'name') {
              ++assertions;
            }
            if (index[0] === 'blogposts._id') {
              ++assertions;
            }
            if (index[0] === 'blogposts.title') {
              ++assertions;
            }
            if (index[0] === 'featured._id') {
              ++assertions;
            }
            if (index[0] === 'featured.title') {
              ++assertions;
            }
          }

          for (var i in indexes) {
            indexes[i].forEach(iter);
          }

          assert.equal(assertions, 5);
          done();
        });
      });
    });

    it('compound: on embedded docs', function(done) {
      var BlogPosts = new Schema({
        title: String,
        desc: String
      });

      BlogPosts.index({title: 1, desc: 1});

      var User = new Schema({
        name: {type: String, index: true},
        blogposts: [BlogPosts]
      });

      var UserModel = db.model('DeepCompoundIndexModel4', User, 'deepcompoundindexmodel' + random());
      var found = 0;

      UserModel.on('index', function() {
        UserModel.collection.getIndexes(function(err, indexes) {
          assert.ifError(err);

          for (var index in indexes) {
            switch (index) {
              case 'name_1':
              case 'blogposts.title_1_blogposts.desc_1':
                ++found;
                break;
            }
          }

          assert.equal(found, 2);
          done();
        });
      });
    });

    it('nested embedded docs (gh-5199)', function(done) {
      var SubSubSchema = mongoose.Schema({
        nested2: String
      });

      SubSubSchema.index({ nested2: 1 });

      var SubSchema = mongoose.Schema({
        nested1: String,
        subSub: SubSubSchema
      });

      SubSchema.index({ nested1: 1 });

      var ContainerSchema = mongoose.Schema({
        nested0: String,
        sub: SubSchema
      });

      ContainerSchema.index({ nested0: 1 });

      assert.deepEqual(ContainerSchema.indexes().map(function(v) { return v[0]; }), [
        { 'sub.subSub.nested2': 1 },
        { 'sub.nested1': 1 },
        { 'nested0': 1 }
      ]);

      done();
    });

    it('primitive arrays (gh-3347)', function(done) {
      var schema = new Schema({
        arr: [{ type: String, unique: true }]
      });

      var indexes = schema.indexes();
      assert.equal(indexes.length, 1);
      assert.deepEqual(indexes[0][0], { arr: 1 });
      assert.ok(indexes[0][1].unique);

      done();
    });

    it('error should emit on the model', function(done) {
      var schema = new Schema({name: {type: String}});
      var Test = db.model('IndexError5', schema, 'x' + random());

      Test.create({name: 'hi'}, {name: 'hi'}, function(err) {
        assert.strictEqual(err, null);
        Test.schema.index({name: 1}, {unique: true});
        Test.schema.index({other: 1});

        Test.on('index', function(err) {
          assert.ok(/E11000 duplicate key error/.test(err.message), err);
          done();
        });

        delete Test.$init;
        Test.init();
      });
    });

    describe('auto creation', function() {
      it('can be disabled', function(done) {
        var schema = new Schema({name: {type: String, index: true}});
        schema.set('autoIndex', false);

        var Test = db.model('AutoIndexing6', schema, 'autoindexing-disable');
        Test.on('index', function() {
          assert.ok(false, 'Model.ensureIndexes() was called');
        });

        // Create a doc because mongodb 3.0 getIndexes errors if db doesn't
        // exist
        Test.create({name: 'Bacon'}, function(err) {
          assert.ifError(err);
          setTimeout(function() {
            Test.collection.getIndexes(function(err, indexes) {
              assert.ifError(err);
              // Only default _id index should exist
              assert.deepEqual(['_id_'], Object.keys(indexes));
              done();
            });
          }, 100);
        });
      });

      describe('global autoIndexes (gh-1875)', function() {
        it('will create indexes as a default', function(done) {
          var schema = new Schema({name: {type: String, index: true}});
          var Test = db.model('GlobalAutoIndex7', schema, 'gh-1875-1');
          Test.on('index', function(error) {
            assert.ifError(error);
            assert.ok(true, 'Model.ensureIndexes() was called');
            Test.collection.getIndexes(function(err, indexes) {
              assert.ifError(err);
              assert.equal(Object.keys(indexes).length, 2);
              done();
            });
          });
        });

        it('will not create indexes if the global auto index is false and schema option isnt set (gh-1875)', function(done) {
          var db = start({config: {autoIndex: false}});
          var schema = new Schema({name: {type: String, index: true}});
          var Test = db.model('GlobalAutoIndex8', schema, 'x' + random());
          Test.on('index', function() {
            assert.ok(false, 'Model.ensureIndexes() was called');
          });

          Test.create({name: 'Bacon'}, function(err) {
            assert.ifError(err);
            setTimeout(function() {
              Test.collection.getIndexes(function(err, indexes) {
                assert.ifError(err);
                assert.deepEqual(['_id_'], Object.keys(indexes));
                db.close(done);
              });
            }, 100);
          });
        });
      });
    });

    describe('model.ensureIndexes()', function() {
      it('is a function', function(done) {
        var schema = mongoose.Schema({x: 'string'});
        var Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        assert.equal(typeof Test.ensureIndexes, 'function');
        done();
      });

      it('returns a Promise', function(done) {
        var schema = mongoose.Schema({x: 'string'});
        var Test = mongoose.createConnection().model('ensureIndexes-' + random, schema);
        var p = Test.ensureIndexes();
        assert.ok(p instanceof mongoose.Promise);
        done();
      });

      it('creates indexes', function(done) {
        var schema = new Schema({name: {type: String}});
        var Test = db.model('ManualIndexing' + random(), schema, 'x' + random());

        Test.schema.index({name: 1}, {sparse: true});

        var called = false;
        Test.on('index', function() {
          called = true;
        });

        Test.ensureIndexes(function(err) {
          assert.ifError(err);
          assert.ok(called);
          done();
        });
      });
    });
  });
});
