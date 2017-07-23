/* vim: set softtabstop=2 ts=2 sw=2 expandtab tw=120: */

/**
 * Test dependencies.
 */

var assert = require('power-assert');
var random = require('../lib/utils').random;
var start = require('./common');

var mongoose = start.mongoose;

var CastError = mongoose.SchemaType.CastError;
var DocumentObjectId = mongoose.Types.ObjectId;
var ObjectId = mongoose.Schema.Types.ObjectId;
var Schema = mongoose.Schema;

describe('model query casting', function() {
  var Comments;
  var BlogPostB;
  var collection;
  var geoSchemaArray;
  var geoSchemaObject;
  var modelName;

  before(function() {
    Comments = new Schema;

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPostB = new Schema({
      title: {$type: String},
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [{$type: Number}],
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: {$type: String, default: 'kandinsky'}
    }, {typeKey: '$type'});

    modelName = 'model.query.casting.blogpost';
    mongoose.model(modelName, BlogPostB);
    collection = 'blogposts_' + random();

    geoSchemaArray = new Schema({loc: {type: [Number], index: '2d'}});
    geoSchemaObject = new Schema({loc: {long: Number, lat: Number}});
    geoSchemaObject.index({loc: '2d'});
  });

  it('works', function(done) {
    var db = start(),
        BlogPostB = db.model(modelName, collection),
        title = 'Loki ' + random();

    var post = new BlogPostB(),
        id = post.get('_id').toString();

    post.set('title', title);

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({_id: id}, function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.get('title'), title);
        db.close(done);
      });
    });
  });

  it('returns cast errors', function(done) {
    var db = start(),
        BlogPostB = db.model(modelName, collection);

    BlogPostB.find({date: 'invalid date'}, function(err) {
      assert.ok(err instanceof Error);
      assert.ok(err instanceof CastError);
      db.close(done);
    });
  });

  it('casts $modifiers', function(done) {
    var db = start(),
        BlogPostB = db.model(modelName, collection),
        post = new BlogPostB({
          meta: {
            visitors: -75
          }
        });

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.find({'meta.visitors': {$gt: '-100', $lt: -50}},
          function(err, found) {
            assert.ifError(err);

            assert.ok(found);
            assert.equal(found.length, 1);
            assert.equal(found[0].get('_id').toString(), post.get('_id'));
            assert.equal(found[0].get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
            db.close(done);
          });
    });
  });

  it('casts $in values of arrays (gh-199)', function(done) {
    var db = start(),
        BlogPostB = db.model(modelName, collection);

    var post = new BlogPostB(),
        id = post._id.toString();

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({_id: {$in: [id]}}, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), id);
        db.close(done);
      });
    });
  });

  it('casts $in values of arrays with single item instead of array (jrl-3238)', function(done) {
    var db = start(),
        BlogPostB = db.model(modelName, collection);

    var post = new BlogPostB(),
        id = post._id.toString();

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({_id: {$in: id}}, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), id);
        db.close();
        done();
      });
    });
  });

  it('casts $nin values of arrays (gh-232)', function(done) {
    var db = start(),
        NinSchema = new Schema({
          num: Number
        });

    mongoose.model('Nin', NinSchema);

    var Nin = db.model('Nin', 'nins_' + random());

    Nin.create({num: 1}, function(err) {
      assert.ifError(err);
      Nin.create({num: 2}, function(err) {
        assert.ifError(err);
        Nin.create({num: 3}, function(err) {
          assert.ifError(err);
          Nin.find({num: {$nin: [2]}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 2);
            db.close(done);
          });
        });
      });
    });
  });

  it('works when finding by Date (gh-204)', function(done) {
    var db = start(),
        P = db.model(modelName, collection);

    var post = new P;

    post.meta.date = new Date();

    post.save(function(err) {
      assert.ifError(err);

      P.findOne({_id: post._id, 'meta.date': {$lte: Date.now()}}, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), post._id.toString());
        doc.meta.date = null;
        doc.save(function(err) {
          assert.ifError(err);
          P.findById(doc._id, function(err, doc) {
            assert.ifError(err);
            assert.strictEqual(doc.meta.date, null);
            db.close(done);
          });
        });
      });
    });
  });

  it('works with $type matching', function(done) {
    var db = start();
    var B = db.model(modelName, collection);

    B.find({title: {$type: {x:1}}}, function(err) {
      assert.equal(err.message, '$type parameter must be number or string');

      B.find({title: {$type: 2}}, function(err, posts) {
        assert.ifError(err);
        assert.strictEqual(Array.isArray(posts), true);
        db.close(done);
      });
    });
  });

  it('works when finding Boolean with $in (gh-998)', function(done) {
    var db = start(),
        B = db.model(modelName, collection);

    var b = new B({published: true});
    b.save(function(err) {
      assert.ifError(err);
      B.find({_id: b._id, boolean: {$in: [null, true]}}, function(err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.equal(doc[0].id, b.id);
        db.close(done);
      });
    });
  });

  it('works when finding Boolean with $ne (gh-1093)', function(done) {
    var db = start(),
        B = db.model(modelName, collection + random());

    var b = new B({published: false});
    b.save(function(err) {
      assert.ifError(err);
      B.find().ne('published', true).exec(function(err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.equal(doc[0].id, b.id);
        db.close(done);
      });
    });
  });

  it('properly casts $and (gh-1180)', function(done) {
    var db = start(),
        B = db.model(modelName, collection + random()),
        result = B.find({}).cast(B, {$and: [{date: '1987-03-17T20:00:00.000Z'}, {_id: '000000000000000000000000'}]});
    assert.ok(result.$and[0].date instanceof Date);
    assert.ok(result.$and[1]._id instanceof DocumentObjectId);
    db.close(done);
  });

  describe('$near', function() {
    this.slow(60);

    it('with arrays', function(done) {
      var db = start(),
          Test = db.model('Geo4', geoSchemaArray, 'y' + random());

      Test.once('index', complete);
      Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          db.close();
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({loc: {$near: ['30', '40']}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with objects', function(done) {
      var db = start(),
          Test = db.model('Geo5', geoSchemaObject, 'y' + random());

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          db.close();
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({loc: {$near: ['30', '40'], $maxDistance: 51}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }

      Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);
      Test.once('index', complete);
    });

    it('with nested objects', function(done) {
      var db = start();
      var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
      geoSchemaObject.index({'loc.nested': '2d'});

      var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          db.close();
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({'loc.nested': {$near: ['30', '40'], $maxDistance: '50'}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 1);
          done();
        });
      }

      Test.once('index', complete);
      Test.create(
          {loc: {nested: {long: 10, lat: 20}}},
          {loc: {nested: {long: 40, lat: 90}}},
          complete);
    });
  });

  describe('$nearSphere', function() {
    this.slow(70);

    it('with arrays', function(done) {
      var db = start(),
          Test = db.model('Geo4', geoSchemaArray, 'y' + random());

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.err = err);
        }
        --pending || test();
      }

      Test.on('index', complete);
      Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

      function test() {
        Test.find({loc: {$nearSphere: ['30', '40']}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with objects', function(done) {
      var db = start(),
          Test = db.model('Geo5', geoSchemaObject, 'y' + random());

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.err = err);
        }
        --pending || test();
      }

      Test.on('index', complete);
      Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);

      function test() {
        Test.find({loc: {$nearSphere: ['30', '40'], $maxDistance: 1}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with nested objects', function(done) {
      var db = start();
      var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
      geoSchemaObject.index({'loc.nested': '2d'});

      var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

      var pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.err = err);
        }
        --pending || test();
      }

      Test.on('index', complete);
      Test.create({loc: {nested: {long: 10, lat: 20}}}, {loc: {nested: {long: 40, lat: 90}}}, complete);

      function test() {
        Test.find({'loc.nested': {$nearSphere: ['30', '40'], $maxDistance: 1}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });
  });

  describe('$within', function() {
    this.slow(60);

    describe('$centerSphere', function() {
      it('with arrays', function(done) {
        var db = start(),
            Test = db.model('Geo4', geoSchemaArray, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

        function test() {
          Test.find({loc: {$within: {$centerSphere: [['11', '20'], '0.4']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with objects', function(done) {
        var db = start(),
            Test = db.model('Geo5', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);

        function test() {
          Test.find({loc: {$within: {$centerSphere: [['11', '20'], '0.4']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        var db = start();
        var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
        geoSchemaObject.index({'loc.nested': '2d'});

        var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {nested: {long: 10, lat: 20}}}, {loc: {nested: {long: 40, lat: 90}}}, complete);

        function test() {
          Test.find({'loc.nested': {$within: {$centerSphere: [['11', '20'], '0.4']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
    });

    describe('$center', function() {
      it('with arrays', function(done) {
        var db = start(),
            Test = db.model('Geo4', geoSchemaArray, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

        function test() {
          Test.find({loc: {$within: {$center: [['11', '20'], '1']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with objects', function(done) {
        var db = start(),
            Test = db.model('Geo5', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);

        function test() {
          Test.find({loc: {$within: {$center: [['11', '20'], '1']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        var db = start();
        var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
        geoSchemaObject.index({'loc.nested': '2d'});

        var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {nested: {long: 10, lat: 20}}}, {loc: {nested: {long: 40, lat: 90}}}, complete);

        function test() {
          Test.find({'loc.nested': {$within: {$center: [['11', '20'], '1']}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
    });

    describe('$polygon', function() {
      it('with arrays', function(done) {
        var db = start(),
            Test = db.model('Geo4', geoSchemaArray, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

        function test() {
          Test.find({loc: {$within: {$polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']]}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with objects', function(done) {
        var db = start(),
            Test = db.model('Geo5', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);

        function test() {
          Test.find({loc: {$within: {$polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']]}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        var db = start();
        var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
        geoSchemaObject.index({'loc.nested': '2d'});

        var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {nested: {long: 10, lat: 20}}}, {loc: {nested: {long: 40, lat: 90}}}, complete);

        function test() {
          Test.find({'loc.nested': {$within: {$polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']]}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });
    });

    describe('$box', function() {
      it('with arrays', function(done) {
        var db = start(),
            Test = db.model('Geo4', geoSchemaArray, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

        function test() {
          Test.find({loc: {$within: {$box: [['8', '1'], ['50', '100']]}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with objects', function(done) {
        var db = start(),
            Test = db.model('Geo5', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {long: 10, lat: 20}}, {loc: {long: 40, lat: 90}}, complete);

        function test() {
          Test.find({loc: {$within: {$box: [['8', '1'], ['50', '100']]}}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        var db = start();
        var geoSchemaObject = new Schema({loc: {nested: {long: Number, lat: Number}}});
        geoSchemaObject.index({'loc.nested': '2d'});

        var Test = db.model('Geo52', geoSchemaObject, 'y' + random());

        var pending = 2;

        function complete(err) {
          if (complete.ran) {
            return;
          }
          if (err) {
            return done(complete.err = err);
          }
          --pending || test();
        }

        Test.on('index', complete);
        Test.create({loc: {nested: {long: 10, lat: 20}}}, {loc: {nested: {long: 40, lat: 90}}}, complete);

        function test() {
          Test.find({'loc.nested': {$within: {$box: [['8', '1'], ['50', '100']]}}}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            db.close(done);
          });
        }
      });
    });
  });

  describe('$options', function() {
    it('works on arrays gh-1462', function(done) {
      var opts = {};
      opts.toString = function() {
        return 'img';
      };

      var db = start(),
          B = db.model(modelName, collection + random()),
          result = B.find({}).cast(B, {tags: {$regex: /a/, $options: opts}});

      assert.equal(result.tags.$options, 'img');
      db.close(done);
    });
  });

  describe('$elemMatch', function() {
    it('should cast String to ObjectId in $elemMatch', function(done) {
      var db = start(),
          BlogPostB = db.model(modelName, collection);

      var commentId = mongoose.Types.ObjectId(111);

      var post = new BlogPostB({comments: [{_id: commentId}]}), id = post._id.toString();

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({_id: id, comments: {$elemMatch: {_id: commentId.toString()}}}, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc._id.toString(), id);
          db.close(done);
        });
      });
    });

    it('should cast String to ObjectId in $elemMatch inside $not', function(done) {
      var db = start(),
          BlogPostB = db.model(modelName, collection);

      var commentId = mongoose.Types.ObjectId(111);

      var post = new BlogPostB({comments: [{_id: commentId}]}), id = post._id.toString();

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({_id: id, comments: {$not: {$elemMatch: {_id: commentId.toString()}}}}, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc, null);
          db.close(done);
        });
      });
    });

    it('should cast subdoc _id typed as String to String in $elemMatch gh3719', function(done) {
      var db = start();

      var child = new Schema({
        _id: {type: String}
      }, {_id: false});

      var parent = new Schema({
        children: [child]
      });

      var Parent = db.model('gh3719-1', parent);

      Parent.create({children: [{ _id: 'foobar' }] }, function(error) {
        assert.ifError(error);
        test();
      });

      function test() {
        Parent.find({
          $and: [{children: {$elemMatch: {_id: 'foobar'}}}]
        }, function(error, docs) {
          assert.ifError(error);

          assert.equal(docs.length, 1);
          db.close(done);
        });
      }
    });

    it('should cast subdoc _id typed as String to String in $elemMatch inside $not gh3719', function(done) {
      var db = start();

      var child = new Schema({
        _id: {type: String}
      }, {_id: false});

      var parent = new Schema({
        children: [child]
      });

      var Parent = db.model('gh3719-2', parent);

      Parent.create({children: [{ _id: 'foobar' }] }, function(error) {
        assert.ifError(error);
        test();
      });

      function test() {
        Parent.find({
          $and: [{children: {$not: {$elemMatch: {_id: 'foobar'}}}}]
        }, function(error, docs) {
          assert.ifError(error);

          assert.equal(docs.length, 0);
          db.close(done);
        });
      }
    });
  });

  it('works with $all (gh-3394)', function(done) {
    var db = start();

    var MyModel = db.model('gh3394', {tags: [ObjectId]});

    var doc = {
      tags: ['00000000000000000000000a', '00000000000000000000000b']
    };

    MyModel.create(doc, function(error, savedDoc) {
      assert.ifError(error);
      assert.equal(typeof savedDoc.tags[0], 'object');
      MyModel.findOne({tags: {$all: doc.tags}}, function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        db.close(done);
      });
    });
  });

  it('date with $not + $type (gh-4632)', function(done) {
    var db = start();

    var MyModel = db.model('gh4632', { test: Date });

    MyModel.find({ test: { $not: { $type: 9 } } }, function(error) {
      assert.ifError(error);
      done();
    });
  });

  it('setOnInsert with custom type (gh-5126)', function(done) {
    var db = start();

    function Point(key, options) {
      mongoose.SchemaType.call(this, key, options, 'Point');
    }

    mongoose.Schema.Types.Point = Point;
    Point.prototype = Object.create(mongoose.SchemaType.prototype);

    var called = 0;
    Point.prototype.cast = function(point) {
      ++called;
      if (point.type !== 'Point') {
        throw new Error('Woops');
      }

      return point;
    };

    var testSchema = new mongoose.Schema({ name: String, test: Point });
    var Test = db.model('gh5126', testSchema);

    var u = {
      $setOnInsert: {
        name: 'a',
        test: {
          type: 'Point'
        }
      }
    };
    Test.findOneAndUpdate({ name: 'a' }, u).
      exec(function(error) {
        assert.ifError(error);
        assert.equal(called, 1);
        done();
      }).
      catch(done);
  });

  it('lowercase in query (gh-4569)', function(done) {
    var db = start();

    var contexts = [];

    var testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    }, { runSettersOnQuery: true });

    var Test = db.model('gh-4569', testSchema);
    Test.create({ name: 'val', num: 2.02 }).
      then(function() {
        assert.equal(contexts.length, 1);
        assert.equal(contexts[0].constructor.name, 'model');
        return Test.findOne({ name: 'VAL' });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 2);
      }).
      then(function() {
        return Test.findOneAndUpdate({}, { num: 3.14 }, { new: true });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 3);
        assert.equal(contexts.length, 2);
        assert.equal(contexts[1].constructor.name, 'Query');
      }).
      then(function() { done(); }).
      catch(done);
  });

  it('runSettersOnQuery only once on find (gh-5434)', function(done) {
    var db = start();

    var vs = [];
    var UserSchema = new mongoose.Schema({
      name: String,
      foo: {
        type: Number,
        get: function(val) {
          return val.toString();
        },
        set: function(val) {
          vs.push(val);
          return val;
        }
      }
    }, { runSettersOnQuery: true });

    var Test = db.model('gh5434', UserSchema);

    Test.find({ foo: '123' }).exec(function(error) {
      assert.ifError(error);
      assert.equal(vs.length, 1);
      assert.strictEqual(vs[0], '123');

      vs = [];
      Test.find({ foo: '123' }, function(error) {
        assert.ifError(error);
        assert.equal(vs.length, 1);
        assert.strictEqual(vs[0], '123');
        done();
      });
    });
  });

  it('runSettersOnQuery as query option (gh-5350)', function(done) {
    var db = start();

    var contexts = [];

    var testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    }, { runSettersOnQuery: false });

    var Test = db.model('gh5350', testSchema);
    Test.create({ name: 'val', num: 2.02 }).
      then(function() {
        assert.equal(contexts.length, 1);
        assert.equal(contexts[0].constructor.name, 'model');
        return Test.findOne({ name: 'VAL' }, { _id: 0 }, {
          runSettersOnQuery: true
        });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 2);
      }).
      then(function() { done(); }).
      catch(done);
  });

  it('_id = 0 (gh-4610)', function(done) {
    var db = start();

    var MyModel = db.model('gh4610', { _id: Number });

    MyModel.create({ _id: 0 }, function(error) {
      assert.ifError(error);
      MyModel.findById({ _id: 0 }, function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        assert.equal(doc._id, 0);
        done();
      });
    });
  });

  it('minDistance (gh-4197)', function(done) {
    var db = start();

    var schema = new Schema({
      name: String,
      loc: {
        type: { type: String },
        coordinates: [Number]
      }
    });

    schema.index({ loc: '2dsphere' });

    var MyModel = db.model('gh4197', schema);

    MyModel.on('index', function(error) {
      assert.ifError(error);
      var docs = [
        { name: 'San Mateo Caltrain', loc: _geojsonPoint([-122.33, 37.57]) },
        { name: 'Squaw Valley', loc: _geojsonPoint([-120.24, 39.21]) },
        { name: 'Mammoth Lakes', loc: _geojsonPoint([-118.9, 37.61]) }
      ];
      var RADIUS_OF_EARTH_IN_METERS = 6378100;
      MyModel.create(docs, function(error) {
        assert.ifError(error);
        MyModel.
          find().
          near('loc', {
            center: [-122.33, 37.57],
            minDistance: (1000 / RADIUS_OF_EARTH_IN_METERS).toString(),
            maxDistance: (280000 / RADIUS_OF_EARTH_IN_METERS).toString(),
            spherical: true
          }).
          exec(function(error, results) {
            assert.ifError(error);
            assert.equal(results.length, 1);
            assert.equal(results[0].name, 'Squaw Valley');
            done();
          });
      });
    });
  });
});

function _geojsonPoint(coordinates) {
  return { type: 'Point', coordinates: coordinates };
}
