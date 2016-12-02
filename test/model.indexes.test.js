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

      var db = start(),
          IndexedModel = db.model('IndexedModel', Indexed, 'indexedmodel' + random()),
          assertions = 0;

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
          db.close(done);
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

      var db = start(),
          UserModel = db.model('DeepIndexedModel', User, 'deepindexedmodel' + random()),
          assertions = 0;

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
          db.close(done);
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

      var db = start();
      var UserModel = db.model('DeepIndexedModel', User, 'gh-2322');
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
          db.close(done);
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

      var db = start(),
          UserModel = db.model('DeepCompoundIndexModel', User, 'deepcompoundindexmodel' + random()),
          found = 0;

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

          db.close();
          assert.equal(found, 2);
          done();
        });
      });
    });

    it('error should emit on the model', function(done) {
      var db = start(),
          schema = new Schema({name: {type: String}}),
          Test = db.model('IndexError', schema, 'x' + random());

      Test.on('index', function(err) {
        db.close();
        assert.ok(/E11000 duplicate key error/.test(err.message), err);
        done();
      });

      Test.create({name: 'hi'}, {name: 'hi'}, function(err) {
        assert.strictEqual(err, null);
        Test.schema.index({name: 1}, {unique: true});
        Test.schema.index({other: 1});
        Test.init();
      });
    });

    describe('auto creation', function() {
      it('can be disabled', function(done) {
        var db = start();
        var schema = new Schema({name: {type: String, index: true}});
        schema.set('autoIndex', false);

        var Test = db.model('AutoIndexing', schema, 'autoindexing-disable');
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
              db.close(done);
            });
          }, 100);
        });
      });

      describe('global autoIndexes (gh-1875)', function() {
        it('will create indexes as a default', function(done) {
          var db = start();
          var schema = new Schema({name: {type: String, index: true}});
          var Test = db.model('GlobalAutoIndex', schema, 'gh-1875-1');
          Test.on('index', function(error) {
            assert.ifError(error);
            assert.ok(true, 'Model.ensureIndexes() was called');
            Test.collection.getIndexes(function(err, indexes) {
              assert.ifError(err);
              assert.equal(Object.keys(indexes).length, 2);
              db.close(done);
            });
          });
        });

        it('will not create indexes if the global auto index is false and schema option isnt set (gh-1875)', function(done) {
          var db = start({config: {autoIndex: false}});
          var schema = new Schema({name: {type: String, index: true}});
          var Test = db.model('GlobalAutoIndex', schema, 'x' + random());
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

    it('do not trigger "MongoError: cannot add index with a background operation in progress" (gh-1365) LONG', function(done) {
      this.timeout(90000);

      var db = start({uri: 'mongodb://localhost/mongoose_test_indexing'});

      var schema = new Schema({
        name: {type: String, index: true},
        furryness: {type: Number, index: true}
      }, {autoIndex: false});

      schema.index({name: 1, furryness: 1});

      var K = db.model('Kitten', schema);
      K.on('index', function(err) {
        assert.ifError(err);
        db.close(done);
      });

      var neededKittens = 30000;

      db.on('open', function() {
        K.count({}, function(err, n) {
          assert.ifError(err);
          if (n >= neededKittens) {
            return index();
          }
          var pending = neededKittens - n;

          function callback(err) {
            assert.ifError(err);
            if (--pending) {
              return;
            }
            index();
          }

          function iter(i) {
            K.create({name: 'kitten' + i, furryness: i}, callback);
          }

          for (var i = n; i < neededKittens; ++i) {
            iter(i);
          }
        });

        function index() {
          K.collection.dropAllIndexes(function(err) {
            assert.ifError(err);
            K.ensureIndexes();
          });
        }
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
        var db = start();
        var schema = new Schema({name: {type: String}}),
            Test = db.model('ManualIndexing', schema, 'x' + random());

        Test.schema.index({name: 1}, {sparse: true});

        var called = false;
        Test.on('index', function() {
          called = true;
        });

        Test.ensureIndexes(function(err) {
          assert.ifError(err);
          assert.ok(called);
          db.close(done);
        });
      });
    });
  });
});
