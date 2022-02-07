'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

const mongoose = start.mongoose;

const CastError = mongoose.SchemaType.CastError;
const DocumentObjectId = mongoose.Types.ObjectId;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Schema = mongoose.Schema;

describe('model query casting', function() {
  let Comments;
  let BlogPostB;
  let geoSchemaArray;
  let geoSchemaObject;
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(function() {
    Comments = new Schema();

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    const BlogPostSchema = new Schema({
      title: { $type: String },
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [{ $type: Number }],
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: { $type: String, default: 'kandinsky' }
    }, { typeKey: '$type' });

    BlogPostB = db.model('BlogPost', BlogPostSchema);

    geoSchemaArray = new Schema({ loc: { type: [Number], index: '2d' } });
    geoSchemaObject = new Schema({ loc: { long: Number, lat: Number } });
    geoSchemaObject.index({ loc: '2d' });
  });

  it('works', function(done) {
    const title = 'Loki ' + random();

    const post = new BlogPostB();
    const id = post.get('_id').toString();

    post.set('title', title);

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({ _id: id }, function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.get('title'), title);
        done();
      });
    });
  });

  it('returns cast errors', function(done) {
    BlogPostB.find({ date: 'invalid date' }, function(err) {
      assert.ok(err instanceof Error);
      assert.ok(err instanceof CastError);
      done();
    });
  });

  it('casts $modifiers', function(done) {
    const post = new BlogPostB({
      meta: {
        visitors: -75
      }
    });

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.find({ 'meta.visitors': { $gt: '-100', $lt: -50 } },
        function(err, found) {
          assert.ifError(err);

          assert.ok(found);
          assert.equal(found.length, 1);
          assert.equal(found[0].get('_id').toString(), post.get('_id'));
          assert.equal(found[0].get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
          done();
        });
    });
  });

  it('casts $in values of arrays (gh-199)', function(done) {
    const post = new BlogPostB();
    const id = post._id.toString();

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({ _id: { $in: [id] } }, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), id);
        done();
      });
    });
  });

  it('casts $in values of arrays with single item instead of array (jrl-3238)', function(done) {
    const post = new BlogPostB();
    const id = post._id.toString();

    post.save(function(err) {
      assert.ifError(err);

      BlogPostB.findOne({ _id: { $in: id } }, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), id);
        done();
      });
    });
  });

  it('casts $nin values of arrays (gh-232)', function(done) {
    const NinSchema = new Schema({
      num: Number
    });

    const Nin = db.model('Test', NinSchema);

    Nin.create({ num: 1 }, function(err) {
      assert.ifError(err);
      Nin.create({ num: 2 }, function(err) {
        assert.ifError(err);
        Nin.create({ num: 3 }, function(err) {
          assert.ifError(err);
          Nin.find({ num: { $nin: [2] } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 2);
            done();
          });
        });
      });
    });
  });

  it('works when finding by Date (gh-204)', function(done) {
    const P = BlogPostB;

    const post = new P();

    post.meta.date = new Date();

    post.save(function(err) {
      assert.ifError(err);

      P.findOne({ _id: post._id, 'meta.date': { $lte: Date.now() } }, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._id.toString(), post._id.toString());
        doc.meta.date = null;
        doc.save(function(err) {
          assert.ifError(err);
          P.findById(doc._id, function(err, doc) {
            assert.ifError(err);
            assert.strictEqual(doc.meta.date, null);
            done();
          });
        });
      });
    });
  });

  it('works with $type matching', async function() {
    const B = BlogPostB;

    await B.deleteMany({});

    await B.collection.insertMany([{ title: 'test' }, { title: 1 }]);

    const err = await B.find({ title: { $type: { x: 1 } } }).then(() => null, err => err);
    assert.equal(err.message,
      '$type parameter must be number, string, or array of numbers and strings');

    let posts = await B.find({ title: { $type: 2 } });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].title, 'test');

    posts = await B.find({ title: { $type: ['string', 'number'] } });
    assert.equal(posts.length, 2);
  });

  it('works when finding Boolean with $in (gh-998)', function(done) {
    const B = BlogPostB;

    const b = new B({ published: true });
    b.save(function(err) {
      assert.ifError(err);
      B.find({ _id: b._id, boolean: { $in: [null, true] } }, function(err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.equal(doc[0].id, b.id);
        done();
      });
    });
  });

  it('works when finding Boolean with $ne (gh-1093)', function(done) {
    const B = BlogPostB;

    const b = new B({ published: false });
    b.save(function(err) {
      assert.ifError(err);
      B.find().ne('published', true).exec(function(err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.equal(doc[0].id, b.id);
        done();
      });
    });
  });

  it('properly casts $and (gh-1180)', function(done) {
    const B = BlogPostB;
    const result = B.find({}).cast(B, { $and: [{ date: '1987-03-17T20:00:00.000Z' }, { _id: '000000000000000000000000' }] });
    assert.ok(result.$and[0].date instanceof Date);
    assert.ok(result.$and[1]._id instanceof DocumentObjectId);
    done();
  });

  describe('$near', function() {
    this.slow(60);

    it('with arrays', function(done) {
      const Test = db.model('Test', geoSchemaArray);

      Test.once('index', complete);
      Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

      let pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({ loc: { $near: ['30', '40'] } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with objects', function(done) {
      const Test = db.model('Test', geoSchemaObject);

      let pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({ loc: { $near: ['30', '40'], $maxDistance: 51 } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }

      Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);
      Test.once('index', complete);
    });

    it('with nested objects', function(done) {
      const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
      geoSchemaObject.index({ 'loc.nested': '2d' });

      const Test = db.model('Test', geoSchemaObject);

      let pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          return done(complete.ran = err);
        }
        --pending || test();
      }

      function test() {
        Test.find({ 'loc.nested': { $near: ['30', '40'], $maxDistance: '50' } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          done();
        });
      }

      Test.once('index', complete);
      Test.create(
        { loc: { nested: { long: 10, lat: 20 } } },
        { loc: { nested: { long: 40, lat: 90 } } },
        complete);
    });
  });

  describe('$nearSphere', function() {
    this.slow(70);

    it('with arrays', function(done) {
      const Test = db.model('Test', geoSchemaArray);

      let pending = 2;

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
      Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

      function test() {
        Test.find({ loc: { $nearSphere: ['30', '40'] } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with objects', function(done) {
      const Test = db.model('Test', geoSchemaObject);

      let pending = 2;

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
      Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

      function test() {
        Test.find({ loc: { $nearSphere: ['30', '40'], $maxDistance: 1 } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('with nested objects', function(done) {
      const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
      geoSchemaObject.index({ 'loc.nested': '2d' });

      const Test = db.model('Test', geoSchemaObject);

      let pending = 2;

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
      Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

      function test() {
        Test.find({ 'loc.nested': { $nearSphere: ['30', '40'], $maxDistance: 1 } }, function(err, docs) {
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
        const Test = db.model('Test', geoSchemaArray);

        let pending = 2;

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
        Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

        function test() {
          Test.find({ loc: { $within: { $centerSphere: [['11', '20'], '0.4'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with objects', function(done) {
        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

        function test() {
          Test.find({ loc: { $within: { $centerSphere: [['11', '20'], '0.4'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

        function test() {
          Test.find({ 'loc.nested': { $within: { $centerSphere: [['11', '20'], '0.4'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
    });

    describe('$center', function() {
      it('with arrays', function(done) {
        const Test = db.model('Test', geoSchemaArray);

        let pending = 2;

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
        Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

        function test() {
          Test.find({ loc: { $within: { $center: [['11', '20'], '1'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with objects', function(done) {
        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

        function test() {
          Test.find({ loc: { $within: { $center: [['11', '20'], '1'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

        function test() {
          Test.find({ 'loc.nested': { $within: { $center: [['11', '20'], '1'] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
    });

    describe('$polygon', function() {
      it('with arrays', function(done) {
        const Test = db.model('Test', geoSchemaArray);

        let pending = 2;

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
        Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

        function test() {
          Test.find({ loc: { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with objects', function(done) {
        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

        function test() {
          Test.find({ loc: { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

        function test() {
          Test.find({ 'loc.nested': { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });
    });

    describe('$box', function() {
      it('with arrays', function(done) {
        const Test = db.model('Test', geoSchemaArray);

        let pending = 2;

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
        Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

        function test() {
          Test.find({ loc: { $within: { $box: [['8', '1'], ['50', '100']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with objects', function(done) {
        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } }, complete);

        function test() {
          Test.find({ loc: { $within: { $box: [['8', '1'], ['50', '100']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });

      it('with nested objects', function(done) {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);

        let pending = 2;

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
        Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } }, complete);

        function test() {
          Test.find({ 'loc.nested': { $within: { $box: [['8', '1'], ['50', '100']] } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);
            done();
          });
        }
      });
    });
  });

  describe('$options', function() {
    it('works on arrays gh-1462', function(done) {
      const opts = {};
      opts.toString = function() {
        return 'img';
      };

      const B = BlogPostB;
      const result = B.find({}).cast(B, { tags: { $regex: /a/, $options: opts } });

      assert.equal(result.tags.$options, 'img');
      done();
    });
    it('does not cast with uppercase (gh-7800)', function(done) {
      const testSchema = new Schema({
        name: { type: String, uppercase: true }
      });

      const Model = db.model('Test', testSchema);
      const result = Model.find({}).cast(Model, { name: { $regex: /a/, $options: 'i' } });

      assert.equal(result.name.$options, 'i');
      done();
    });
  });

  describe('$elemMatch', function() {
    it('should cast String to ObjectId in $elemMatch', function(done) {
      const commentId = new mongoose.Types.ObjectId(111);

      const post = new BlogPostB({ comments: [{ _id: commentId }] });
      const id = post._id.toString();

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ _id: id, comments: { $elemMatch: { _id: commentId.toString() } } }, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc._id.toString(), id);
          done();
        });
      });
    });

    it('should cast String to ObjectId in $elemMatch inside $not', function(done) {
      const commentId = new mongoose.Types.ObjectId(111);

      const post = new BlogPostB({ comments: [{ _id: commentId }] });
      const id = post._id.toString();

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ _id: id, comments: { $not: { $elemMatch: { _id: commentId.toString() } } } }, function(err, doc) {
          assert.ifError(err);

          assert.equal(doc, null);
          done();
        });
      });
    });

    it('should cast subdoc _id typed as String to String in $elemMatch gh3719', function(done) {
      const child = new Schema({
        _id: { type: String }
      }, { _id: false });

      const parent = new Schema({
        children: [child]
      });

      const Parent = db.model('Parent', parent);

      Parent.create({ children: [{ _id: 'foobar' }] }, function(error) {
        assert.ifError(error);
        test();
      });

      function test() {
        Parent.find({
          $and: [{ children: { $elemMatch: { _id: 'foobar' } } }]
        }, function(error, docs) {
          assert.ifError(error);

          assert.equal(docs.length, 1);
          done();
        });
      }
    });

    it('should cast subdoc _id typed as String to String in $elemMatch inside $not gh3719', function(done) {
      const child = new Schema({
        _id: { type: String }
      }, { _id: false });

      const parent = new Schema({
        children: [child]
      });

      const Parent = db.model('Parent', parent);

      Parent.create({ children: [{ _id: 'foobar' }] }, function(error) {
        assert.ifError(error);
        test();
      });

      function test() {
        Parent.find({
          $and: [{ children: { $not: { $elemMatch: { _id: 'foobar' } } } }]
        }, function(error, docs) {
          assert.ifError(error);

          assert.equal(docs.length, 0);
          done();
        });
      }
    });

    it('casts $nor within $elemMatch (gh-9479)', async function() {
      const Test = db.model('Test', Schema({
        arr: [{ x: Number, y: Number }]
      }));

      const _doc = await Test.create({ arr: [{ x: 1 }, { y: 3 }, { x: 2 }] });

      const doc = await Test.findOne({
        arr: { $elemMatch: { $nor: [{ x: 1 }, { y: 3 }] } }
      });

      assert.equal(_doc._id.toString(), doc._id.toString());
    });
  });

  it('works with $all (gh-3394)', function(done) {
    const MyModel = db.model('Test', { tags: [ObjectId] });

    const doc = {
      tags: ['00000000000000000000000a', '00000000000000000000000b']
    };

    MyModel.create(doc, function(error, savedDoc) {
      assert.ifError(error);
      assert.equal(typeof savedDoc.tags[0], 'object');
      MyModel.findOne({ tags: { $all: doc.tags } }, function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        done();
      });
    });
  });

  it('date with $not + $type (gh-4632)', function(done) {
    const MyModel = db.model('Test', { test: Date });

    MyModel.find({ test: { $not: { $type: 9 } } }, function(error) {
      assert.ifError(error);
      done();
    });
  });

  it('setOnInsert with custom type (gh-5126)', function(done) {
    function Point(key, options) {
      mongoose.SchemaType.call(this, key, options, 'Point');
    }

    mongoose.Schema.Types.Point = Point;
    Point.prototype = Object.create(mongoose.SchemaType.prototype);

    let called = 0;
    Point.prototype.cast = function(point) {
      ++called;
      if (point.type !== 'Point') {
        throw new Error('Woops');
      }

      return point;
    };

    const testSchema = new mongoose.Schema({ name: String, test: Point });
    const Test = db.model('Test', testSchema);

    const u = {
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
      });
  });

  it('lowercase in query (gh-4569)', function(done) {
    const contexts = [];

    const testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    });

    const Test = db.model('Test', testSchema);
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
    let vs = [];
    const UserSchema = new mongoose.Schema({
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
    });

    const Test = db.model('Test', UserSchema);

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

  it('setters run only once on findOne (gh-6157)', function(done) {
    let vs = [];
    const UserSchema = new mongoose.Schema({
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
    });

    const Test = db.model('Test', UserSchema);

    Test.findOne({ foo: '123' }).exec(function(error) {
      assert.ifError(error);
      assert.equal(vs.length, 1);
      assert.strictEqual(vs[0], '123');

      vs = [];
      Test.findOne({ foo: '123' }, function(error) {
        assert.ifError(error);
        assert.equal(vs.length, 1);
        assert.strictEqual(vs[0], '123');
        done();
      });
    });
  });

  it('runSettersOnQuery as query option (gh-5350)', function(done) {
    const contexts = [];

    const testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    });

    const Test = db.model('Test', testSchema);
    Test.create({ name: 'val', num: 2.02 }).
      then(function() {
        assert.equal(contexts.length, 1);
        assert.equal(contexts[0].constructor.name, 'model');
        return Test.findOne({ name: 'VAL' }, { _id: 0 });
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
    const MyModel = db.model('Test', { _id: Number });

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

  it('converts to CastError (gh-6803)', function() {
    const membershipSchema = new Schema({ tier: String });
    const schema = new Schema({ membership: membershipSchema, name: String });
    const Model = db.model('Test', schema);

    return Model.findOne({ membership: '12345' }).
      catch(error => {
        assert.equal(error.name, 'CastError');
        assert.equal(error.path, 'membership');
        assert.equal(error.reason.name, 'ObjectParameterError');
      });
  });

  it('minDistance (gh-4197)', function(done) {
    const schema = new Schema({
      name: String,
      loc: {
        type: { type: String },
        coordinates: [Number]
      }
    });

    schema.index({ loc: '2dsphere' });

    const MyModel = db.model('Test', schema);

    MyModel.on('index', function(error) {
      assert.ifError(error);
      const docs = [
        { name: 'San Mateo Caltrain', loc: _geojsonPoint([-122.33, 37.57]) },
        { name: 'Squaw Valley', loc: _geojsonPoint([-120.24, 39.21]) },
        { name: 'Mammoth Lakes', loc: _geojsonPoint([-118.9, 37.61]) }
      ];
      const RADIUS_OF_EARTH_IN_METERS = 6378100;
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
  it('array ops don\'t break with strict:false (gh-6952)', function(done) {
    const schema = new Schema({}, { strict: false });
    const Test = db.model('Test', schema);
    Test.create({ outerArray: [] })
      .then(function(created) {
        const toBePushedObj = { innerArray: ['onetwothree'] };
        const update = { $push: { outerArray: toBePushedObj } };
        const opts = { new: true };
        return Test.findOneAndUpdate({ _id: created._id }, update, opts);
      })
      .then(function(updated) {
        const doc = updated.toObject();
        assert.strictEqual(doc.outerArray[0].innerArray[0], 'onetwothree');
        done();
      });
  });
});

function _geojsonPoint(coordinates) {
  return { type: 'Point', coordinates: coordinates };
}
