/* vim: set softtabstop=2 ts=2 sw=2 expandtab tw=120: */

/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    SchemaType = mongoose.SchemaType,
    CastError = SchemaType.CastError,
    ObjectId = Schema.Types.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
  title: String,
  date: Date,
  body: String,
  comments: [Comments]
});

var BlogPostB = new Schema({
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

var modelName = 'model.query.casting.blogpost';
mongoose.model(modelName, BlogPostB);
var collection = 'blogposts_' + random();

var geoSchemaArray = new Schema({loc: {type: [Number], index: '2d'}});
var geoSchemaObject = new Schema({loc: {long: Number, lat: Number}});
geoSchemaObject.index({loc: '2d'});

describe('model query casting', function() {
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
        assert.equal(title, doc.get('title'));
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
            assert.equal(1, found.length);
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
            assert.equal(2, found.length);
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
    var db = start(),
        B = db.model(modelName, collection);

    B.find({title: {$type: 'asd'}}, function(err) {
      assert.equal(err.message, '$type parameter must be Number');

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
          assert.equal(2, docs.length);
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
          assert.equal(2, docs.length);
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
          assert.equal(1, docs.length);
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
          assert.equal(2, docs.length);
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
          assert.equal(2, docs.length);
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
          assert.equal(2, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(1, docs.length);
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
            assert.equal(2, docs.length);
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
            assert.equal(2, docs.length);
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
            assert.equal(2, docs.length);
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
            assert.equal(2, docs.length);
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
            assert.equal(2, docs.length);
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
            assert.equal(2, docs.length);
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

      assert.equal('img', result.tags.$options);
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
});
