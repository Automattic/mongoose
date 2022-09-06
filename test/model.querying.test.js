'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const Query = require('../lib/query');
const assert = require('assert');
const random = require('./util').random;
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const MongooseBuffer = mongoose.Types.Buffer;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model: querying:', function() {
  let Comments;
  let BlogPostB;
  let ModSchema;
  let geoSchema;
  let db;

  before(() => { db = start(); });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(function() {
    Comments = new Schema();

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPostB = new Schema({
      title: String,
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [Number],
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: { type: String, default: 'kandinsky' }
    });

    BlogPostB = db.model('BlogPost', BlogPostB);

    ModSchema = Schema({
      num: Number, str: String
    });

    geoSchema = new Schema({ loc: { type: [Number], index: '2d' } });
  });

  let mongo26_or_greater = false;
  before(async function() {
    const version = await start.mongodVersion();

    mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
    if (!mongo26_or_greater) {
      console.log('not testing mongodb 2.6 features');
    }
  });

  after(async function() {
    await db.close();
  });

  it('find returns a Query', function(done) {
    // query
    assert.ok(BlogPostB.find({}) instanceof Query);

    // query, fields
    assert.ok(BlogPostB.find({}, {}) instanceof Query);

    // query, fields (empty string)
    assert.ok(BlogPostB.find({}, '') instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.find({}, {}, {}) instanceof Query);

    // query, fields (null), options
    assert.ok(BlogPostB.find({}, null, {}) instanceof Query);

    done();
  });

  it('findOne returns a Query', function(done) {
    // query
    assert.ok(BlogPostB.findOne({}) instanceof Query);

    // query, fields
    assert.ok(BlogPostB.findOne({}, {}) instanceof Query);

    // query, fields (empty string)
    assert.ok(BlogPostB.findOne({}, '') instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.findOne({}, {}, {}) instanceof Query);

    // query, fields (null), options
    assert.ok(BlogPostB.findOne({}, null, {}) instanceof Query);

    done();
  });

  it('an empty find does not hang', function(done) {
    function fn() {
      done();
    }

    BlogPostB.find({}, fn);
  });

  it('a query is executed when a callback is passed', function(done) {
    let count = 5;
    const q = { _id: new DocumentObjectId() }; // make sure the query is fast

    function fn() {
      if (--count) {
        return;
      }
      done();
    }

    // query
    assert.ok(BlogPostB.find(q, fn) instanceof Query);

    // query, fields (object)
    assert.ok(BlogPostB.find(q, {}, fn) instanceof Query);

    // query, fields (null)
    assert.ok(BlogPostB.find(q, null, fn) instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.find(q, {}, {}, fn) instanceof Query);

    // query, fields (''), options
    assert.ok(BlogPostB.find(q, '', {}, fn) instanceof Query);
  });

  it('query is executed where a callback for findOne', function(done) {
    let count = 5;
    const q = { _id: new DocumentObjectId() }; // make sure the query is fast

    function fn() {
      if (--count) {
        return;
      }
      done();
    }

    // query
    assert.ok(BlogPostB.findOne(q, fn) instanceof Query);

    // query, fields
    assert.ok(BlogPostB.findOne(q, {}, fn) instanceof Query);

    // query, fields (empty string)
    assert.ok(BlogPostB.findOne(q, '', fn) instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.findOne(q, {}, {}, fn) instanceof Query);

    // query, fields (null), options
    assert.ok(BlogPostB.findOne(q, null, {}, fn) instanceof Query);
  });

  describe.skip('count', function() {
    it('returns a Query', function(done) {
      assert.ok(BlogPostB.count({}) instanceof Query);
      done();
    });

    it('Query executes when you pass a callback', function(done) {
      let pending = 2;

      function fn() {
        if (--pending) {
          return;
        }
        done();
      }

      assert.ok(BlogPostB.count({}, fn) instanceof Query);
      assert.ok(BlogPostB.count(fn) instanceof Query);
    });

    it('counts documents', function(done) {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        const post = new BlogPostB();
        post.set('title', title);

        post.save(function(err) {
          assert.ifError(err);

          BlogPostB.count({ title: title }, function(err, count) {
            assert.ifError(err);

            assert.equal(typeof count, 'number');
            assert.equal(count, 2);

            done();
          });
        });
      });
    });
  });

  describe('distinct', function() {
    it('returns a Query', function(done) {
      assert.ok(BlogPostB.distinct('title', {}) instanceof Query);
      done();
    });

    it('executes when you pass a callback', function(done) {
      let Address = new Schema({ zip: String });
      Address = db.model('Test', Address);

      Address.create({ zip: '10010' }, { zip: '10010' }, { zip: '99701' }, function(err) {
        assert.strictEqual(null, err);
        const query = Address.distinct('zip', {}, function(err, results) {
          assert.ifError(err);
          assert.equal(results.length, 2);
          assert.ok(results.indexOf('10010') > -1);
          assert.ok(results.indexOf('99701') > -1);
          done();
        });
        assert.ok(query instanceof Query);
      });
    });

    it('permits excluding conditions gh-1541', function(done) {
      let Address = new Schema({ zip: String });
      Address = db.model('Test', Address);
      Address.create({ zip: '10010' }, { zip: '10010' }, { zip: '99701' }, function(err) {
        assert.ifError(err);
        Address.distinct('zip', function(err, results) {
          assert.ifError(err);
          assert.equal(results.length, 2);
          assert.ok(results.indexOf('10010') > -1);
          assert.ok(results.indexOf('99701') > -1);
          done();
        });
      });
    });
  });

  describe('update', function() {
    it('returns a Query', function(done) {
      assert.ok(BlogPostB.update({}, {}) instanceof Query);
      assert.ok(BlogPostB.update({}, {}, {}) instanceof Query);
      done();
    });

    it('Query executes when you pass a callback', function(done) {
      let count = 2;

      function fn() {
        if (--count) {
          return;
        }
        done();
      }

      assert.ok(BlogPostB.update({ title: random() }, {}, fn) instanceof Query);
      assert.ok(BlogPostB.update({ title: random() }, {}, {}, fn) instanceof Query);
    });

    it('can handle minimize option (gh-3381)', function() {
      const Model = db.model('Test', {
        name: String,
        mixed: Schema.Types.Mixed
      });

      return Model.create({}).
        then(() => Model.replaceOne({}, { mixed: {}, name: 'abc' }, { minimize: true })).
        then(() => Model.collection.findOne()).
        then(doc => {
          assert.ok(doc.mixed == null);
        }).
        catch(err => {
          throw err;
        });
    });
  });

  describe('findOne', function() {
    it('works', function(done) {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ title: title }, function(err, doc) {
          assert.ifError(err);
          assert.equal(title, doc.get('title'));
          assert.equal(doc.isNew, false);

          done();
        });
      });
    });

    it('casts $modifiers', function(done) {
      const post = new BlogPostB({
        meta: {
          visitors: -10
        }
      });

      post.save(function(err) {
        assert.ifError(err);

        const query = { 'meta.visitors': { $gt: '-20', $lt: -1 } };
        BlogPostB.findOne(query, function(err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(found.get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
          found.id; // trigger caching
          assert.equal(found.get('_id').toString(), post.get('_id'));
          done();
        });
      });
    });

    it('querying if an array contains one of multiple members $in a set', function(done) {
      const post = new BlogPostB();

      post.tags.push('football');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ tags: { $in: ['football', 'baseball'] } }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(), post._id);

          BlogPostB.findOne({ _id: post._id, tags: /otba/i }, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc._id.toString(), post._id);
            done();
          });
        });
      });
    });

    it('querying if an array contains one of multiple members $in a set 2', function(done) {
      const BlogPostA = BlogPostB;
      const post = new BlogPostA({ tags: ['gooberOne'] });

      post.save(function(err) {
        assert.ifError(err);

        const query = { tags: { $in: ['gooberOne'] } };

        BlogPostA.findOne(query, function(err, returned) {
          cb();
          assert.ifError(err);
          assert.ok(!!~returned.tags.indexOf('gooberOne'));
          assert.equal(returned._id.toString(), post._id);
        });
      });

      const doc = { meta: { visitors: 9898, a: null } };
      post.collection.insertOne(doc, {}, function(err) {
        assert.ifError(err);

        BlogPostA.findOne({ _id: doc._id }, function(err, found) {
          cb();
          assert.ifError(err);
          assert.equal(found.get('meta.visitors'), 9898);
        });
      });

      let pending = 2;

      function cb() {
        if (--pending) {
          return;
        }
        done();
      }
    });

    it('querying via $where a string', function(done) {
      BlogPostB.create({ title: 'Steve Jobs', author: 'Steve Jobs' }, function(err, created) {
        assert.ifError(err);

        BlogPostB.findOne({ $where: 'this.title && this.title === this.author' }, function(err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(), created._id);
          done();
        });
      });
    });

    it('querying via $where a function', function(done) {
      BlogPostB.create({ author: 'Atari', slug: 'Atari' }, function(err, created) {
        assert.ifError(err);

        BlogPostB.findOne({
          $where: function() {
            return (this.author && this.slug && this.author === this.slug);
          }
        }, function(err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(), created._id);
          done();
        });
      });
    });

    it('based on nested fields', function(done) {
      const post = new BlogPostB({
        meta: {
          visitors: 5678
        }
      });

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ 'meta.visitors': 5678 }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.get('meta.visitors')
            .valueOf(), post.get('meta.visitors').valueOf());
          assert.equal(found.get('_id').toString(), post.get('_id'));
          done();
        });
      });
    });

    it('based on embedded doc fields (gh-242, gh-463)', function(done) {
      BlogPostB.create({ comments: [{ title: 'i should be queryable' }], numbers: [1, 2, 33333], tags: ['yes', 'no'] }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({ 'comments.title': 'i should be queryable' }, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          BlogPostB.findOne({ 'comments.0.title': 'i should be queryable' }, function(err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);

            // GH-463
            BlogPostB.findOne({ 'numbers.2': 33333 }, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.findOne({ 'tags.1': 'no' }, function(err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);
                done();
              });
            });
          });
        });
      });
    });

    it('works with nested docs and string ids (gh-389)', function(done) {
      BlogPostB.create({ comments: [{ title: 'i should be queryable by _id' }, { title: 'me too me too!' }] }, function(err, created) {
        assert.ifError(err);
        const id = created.comments[1]._id.toString();
        BlogPostB.findOne({ 'comments._id': id }, function(err, found) {
          assert.ifError(err);
          assert.strictEqual(!!found, true, 'Find by nested doc id hex string fails');
          assert.equal(found._id.toString(), created._id);
          done();
        });
      });
    });

    it('using #all with nested #elemMatch', function(done) {
      const P = BlogPostB;
      const post = new P({ title: 'nested elemMatch' });
      post.comments.push({ title: 'comment A' }, { title: 'comment B' }, { title: 'comment C' });

      const id1 = post.comments[1]._id;
      const id2 = post.comments[2]._id;

      post.save(function(err) {
        assert.ifError(err);

        const query0 = { $elemMatch: { _id: id1, title: 'comment B' } };
        const query1 = { $elemMatch: { _id: id2.toString(), title: 'comment C' } };

        P.findOne({ comments: { $all: [query0, query1] } }, function(err, p) {
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('using #or with nested #elemMatch', function(done) {
      const P = BlogPostB;
      const post = new P({ title: 'nested elemMatch' });
      post.comments.push({ title: 'comment D' }, { title: 'comment E' }, { title: 'comment F' });

      const id1 = post.comments[1]._id;

      post.save(function(err) {
        assert.ifError(err);

        const query0 = { comments: { $elemMatch: { title: 'comment Z' } } };
        const query1 = { comments: { $elemMatch: { _id: id1.toString(), title: 'comment E' } } };

        P.findOne({ $or: [query0, query1] }, function(err, p) {
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('buffer $in array', function(done) {
      BlogPostB.create({
        sigs: [Buffer.from([1, 2, 3]),
          Buffer.from([4, 5, 6]),
          Buffer.from([7, 8, 9])]
      }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({ sigs: Buffer.from([1, 2, 3]) }, function(err, found) {
          assert.ifError(err);
          found.id;
          assert.equal(found._id.toString(), created._id);
          const query = { sigs: { $in: [Buffer.from([3, 3, 3]), Buffer.from([4, 5, 6])] } };
          BlogPostB.findOne(query, function(err) {
            assert.ifError(err);
            done();
          });
        });
      });
    });

    it('regex with Array (gh-599)', function(done) {
      const B = BlogPostB;
      B.create({ tags: 'wooof baaaark meeeeow'.split(' ') }, function(err) {
        assert.ifError(err);
        B.findOne({ tags: /ooof$/ }, function(err, doc) {
          assert.ifError(err);
          assert.strictEqual(true, !!doc);
          assert.ok(!!~doc.tags.indexOf('meeeeow'));

          B.findOne({ tags: { $regex: 'eow$' } }, function(err, doc) {
            assert.ifError(err);
            assert.strictEqual(true, !!doc);
            assert.strictEqual(true, !!~doc.tags.indexOf('meeeeow'));
            done();
          });
        });
      });
    });

    it('regex with options', function(done) {
      const B = BlogPostB;
      const post = new B({ title: '$option queries' });
      post.save(function(err) {
        assert.ifError(err);
        B.findOne({ title: { $regex: ' QUERIES$', $options: 'i' } }, function(err, doc) {
          assert.strictEqual(null, err, err && err.stack);
          assert.equal(doc.id, post.id);
          done();
        });
      });
    });

    it('works with $elemMatch and $in combo (gh-1100)', function(done) {
      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();

      BlogPostB.create({ owners: [id1, id2] }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({ owners: { $elemMatch: { $in: [id2.toString()] } } }, function(err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(created.id, found.id);
          done();
        });
      });
    });
  });

  describe('findById', function() {
    it('handles undefined', function(done) {
      const title = 'Edwald ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findById(undefined, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc, null);
          done();
        });
      });
    });

    it('works', function(done) {
      const title = 'Edwald ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        let pending = 2;

        BlogPostB.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(doc.get('title'), title);
          if (--pending) {
            return;
          }
          done();
        });

        BlogPostB.findById(post.get('_id').toHexString(), function(err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(doc.get('title'), title);
          if (--pending) {
            return;
          }
          done();
        });
      });
    });

    it('works with partial initialization', function(done) {
      let queries = 5;

      const post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';
      post.meta.visitors = 53;
      post.tags = ['humidity', 'soggy'];

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);

          assert.equal(doc.isInit('title'), true);
          assert.equal(doc.isInit('slug'), true);
          assert.equal(doc.isInit('date'), false);
          assert.equal(doc.isInit('meta.visitors'), true);
          assert.equal(doc.meta.visitors.valueOf(), 53);
          assert.equal(doc.tags.length, 2);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.findById(post.get('_id'), 'title', function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.isInit('title'), true);
          assert.equal(doc.isInit('slug'), false);
          assert.equal(doc.isInit('date'), false);
          assert.equal(doc.isInit('meta.visitors'), false);
          assert.equal(doc.meta.visitors, undefined);
          assert.equal(doc.tags, undefined);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.findById(post.get('_id'), '-slug', function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.isInit('title'), true);
          assert.equal(doc.isInit('slug'), false);
          assert.equal(doc.isInit('date'), false);
          assert.equal(doc.isInit('meta.visitors'), true);
          assert.equal(doc.meta.visitors, 53);
          assert.equal(doc.tags.length, 2);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.findById(post.get('_id'), { title: 1 }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.isInit('title'), true);
          assert.equal(doc.isInit('slug'), false);
          assert.equal(doc.isInit('date'), false);
          assert.equal(doc.isInit('meta.visitors'), false);
          assert.equal(doc.meta.visitors, undefined);
          assert.equal(doc.tags, undefined);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.findById(post.get('_id'), 'slug', function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.isInit('title'), false);
          assert.equal(doc.isInit('slug'), true);
          assert.equal(doc.isInit('date'), false);
          assert.equal(doc.isInit('meta.visitors'), false);
          assert.equal(doc.meta.visitors, undefined);
          assert.equal(doc.tags, undefined);
          if (--queries) {
            return;
          }
          done();
        });
      });
    });

    it('querying if an array contains at least a certain single member (gh-220)', function(done) {
      const post = new BlogPostB();

      post.tags.push('cat');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({ tags: 'cat' }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(), post._id);
          done();
        });
      });
    });


    it('where an array where the $slice operator', function(done) {
      BlogPostB.create({ numbers: [500, 600, 700, 800] }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findById(created._id, { numbers: { $slice: 2 } }, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);
          assert.equal(found.numbers.length, 2);
          assert.equal(found.numbers[0], 500);
          assert.equal(found.numbers[1], 600);
          BlogPostB.findById(created._id, { numbers: { $slice: -2 } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);
            assert.equal(found.numbers.length, 2);
            assert.equal(found.numbers[0], 700);
            assert.equal(found.numbers[1], 800);
            BlogPostB.findById(created._id, { numbers: { $slice: [1, 2] } }, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);
              assert.equal(found.numbers.length, 2);
              assert.equal(found.numbers[0], 600);
              assert.equal(found.numbers[1], 700);
              done();
            });
          });
        });
      });
    });
  });

  describe('find', function() {
    it('works', function(done) {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        const post = new BlogPostB();
        post.set('title', title);

        post.save(function(err) {
          assert.ifError(err);

          BlogPostB.find({ title: title }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);

            assert.equal(title, docs[0].get('title'));
            assert.equal(docs[0].isNew, false);

            assert.equal(title, docs[1].get('title'));
            assert.equal(docs[1].isNew, false);

            done();
          });
        });
      });
    });

    it('returns docs where an array that contains one specific member', function(done) {
      BlogPostB.create({ numbers: [100, 101, 102] }, function(err, created) {
        assert.ifError(err);
        BlogPostB.find({ numbers: 100 }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 1);
          assert.equal(found[0]._id.toString(), created._id);
          done();
        });
      });
    });

    it('works when comparing $ne with single value against an array', function(done) {
      const schema = new Schema({
        ids: [Schema.ObjectId],
        b: Schema.ObjectId
      });

      const NE = db.model('Test', schema);

      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();
      const id3 = new DocumentObjectId();
      const id4 = new DocumentObjectId();

      NE.create({ ids: [id1, id4], b: id3 }, function(err) {
        assert.ifError(err);
        NE.create({ ids: [id2, id4], b: id3 }, function(err) {
          assert.ifError(err);

          const query = NE.find({ b: id3.toString(), ids: { $ne: id1 } });
          query.exec(function(err, nes1) {
            assert.ifError(err);
            assert.equal(nes1.length, 1);

            NE.find({ b: { $ne: [1] } }, function(err) {
              assert.equal(err.message, 'Cast to ObjectId failed for value "[ 1 ]" (type Array) at path "b" for model "Test"');

              NE.find({ b: { $ne: 4 } }, function(err) {
                assert.equal(err.message, 'Cast to ObjectId failed for value "4" (type number) at path "b" for model "Test"');

                NE.find({ b: id3, ids: { $ne: id4 } }, function(err, nes4) {
                  assert.ifError(err);
                  assert.equal(nes4.length, 0);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('with partial initialization', function(done) {
      let queries = 4;

      const post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.find({ _id: post.get('_id') }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), true);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual('kandinsky', docs[0].def);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, 'title', function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), false);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, { slug: 0, def: 0 }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), false);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, 'slug', function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), false);
          assert.equal(docs[0].isInit('slug'), true);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          done();
        });
      });
    });

    it('where $exists', async function() {
      const ExistsSchema = new Schema({ a: Number, b: String });
      const Exists = db.model('Test', ExistsSchema);

      await Exists.create({ a: 1 }, { b: 'hi' });
      let docs = await Exists.find({ b: { $exists: true } });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].b, 'hi');

      docs = await Exists.find({ b: { $exists: 'true' } });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].b, 'hi');

      let threw = false;
      try {
        await Exists.find({ b: { $exists: 'foo' } });
      } catch (error) {
        threw = true;
        assert.equal(error.path, 'b');
        assert.equal(error.value, 'foo');
        assert.equal(error.name, 'CastError');
      }
      assert.ok(threw);
    });

    it('works with $elemMatch (gh-1100)', function(done) {
      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();

      BlogPostB.create({ owners: [id1, id2] }, function(err) {
        assert.ifError(err);
        BlogPostB.find({ owners: { $elemMatch: { $in: [id2.toString()] } } }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 1);
          done();
        });
      });
    });

    it('where $mod', function(done) {
      const Mod = db.model('Test', ModSchema);
      Mod.create({ num: 1 }, function(err, one) {
        assert.ifError(err);
        Mod.create({ num: 2 }, function(err) {
          assert.ifError(err);
          Mod.find({ num: { $mod: [2, 1] } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
            done();
          });
        });
      });
    });

    it('where $not', function(done) {
      const Mod = db.model('Test', ModSchema);
      Mod.create({ num: 1 }, function(err) {
        assert.ifError(err);
        Mod.create({ num: 2 }, function(err, two) {
          assert.ifError(err);
          Mod.find({ num: { $not: { $mod: [2, 1] } } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
            done();
          });
        });
      });
    });

    it('where or()', function(done) {
      const Mod = db.model('Test', ModSchema);

      Mod.create({ num: 1 }, { num: 2, str: 'two' }, function(err, one, two) {
        assert.ifError(err);

        let pending = 3;
        test1();
        test2();
        test3();

        function test1() {
          Mod.find({ $or: [{ num: 1 }, { num: 2 }] }, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 2);

            let found1 = false;
            let found2 = false;

            found.forEach(function(doc) {
              if (doc.id === one.id) {
                found1 = true;
              } else if (doc.id === two.id) {
                found2 = true;
              }
            });

            assert.ok(found1);
            assert.ok(found2);
          });
        }

        function test2() {
          Mod.find({ $or: [{ str: 'two' }, { str: 'three' }] }, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
          });
        }

        function test3() {
          Mod.find({ $or: [{ num: 1 }] }).or([{ str: 'two' }]).exec(function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 2);

            let found1 = false;
            let found2 = false;

            found.forEach(function(doc) {
              if (doc.id === one.id) {
                found1 = true;
              } else if (doc.id === two.id) {
                found2 = true;
              }
            });

            assert.ok(found1);
            assert.ok(found2);
          });
        }

        function cb() {
          if (--pending) {
            return;
          }
          done();
        }
      });
    });

    it('using $or with array of Document', function(done) {
      const Mod = db.model('Test', ModSchema);

      Mod.create({ num: 1 }, function(err, one) {
        assert.ifError(err);
        Mod.find({ num: 1 }, function(err, found) {
          assert.ifError(err);
          Mod.find({ $or: found }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
            done();
          });
        });
      });
    });

    it('where $ne', function(done) {
      const Mod = db.model('Test', ModSchema);
      Mod.create({ num: 1 }, function(err) {
        assert.ifError(err);
        Mod.create({ num: 2 }, function(err, two) {
          assert.ifError(err);
          Mod.create({ num: 3 }, function(err, three) {
            assert.ifError(err);
            Mod.find({ num: { $ne: 1 } }, function(err, found) {
              assert.ifError(err);

              assert.equal(found.length, 2);
              assert.equal(found[0]._id.toString(), two._id);
              assert.equal(found[1]._id.toString(), three._id);
              done();
            });
          });
        });
      });
    });

    it('where $nor', function(done) {
      const Mod = db.model('Test', ModSchema);

      Mod.create({ num: 1 }, { num: 2, str: 'two' }, function(err, one, two) {
        assert.ifError(err);

        let pending = 3;
        test1();
        test2();
        test3();

        function test1() {
          Mod.find({ $nor: [{ num: 1 }, { num: 3 }] }, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
          });
        }

        function test2() {
          Mod.find({ $nor: [{ str: 'two' }, { str: 'three' }] }, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
          });
        }

        function test3() {
          Mod.find({ $nor: [{ num: 2 }] }).nor([{ str: 'two' }]).exec(function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
          });
        }

        function cb() {
          if (--pending) {
            return;
          }
          done();
        }
      });
    });

    it('STRICT null matches', function(done) {
      const a = { title: 'A', author: null };
      const b = { title: 'B' };
      BlogPostB.create(a, b, function(err, createdA) {
        assert.ifError(err);
        BlogPostB.find({ author: { $in: [null], $exists: true } }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 1);
          assert.equal(found[0]._id.toString(), createdA._id);
          done();
        });
      });
    });

    it('null matches null and undefined', function(done) {
      BlogPostB.create(
        { title: 'A', author: null },
        { title: 'B' }, function(err) {
          assert.ifError(err);
          BlogPostB.find({ author: null }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 2);
            done();
          });
        });
    });

    it('a document whose arrays contain at least $all string values', function(done) {
      const post = new BlogPostB({ title: 'Aristocats' });

      post.tags.push('onex');
      post.tags.push('twox');
      post.tags.push('threex');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findById(post._id, function(err, post) {
          assert.ifError(err);

          BlogPostB.find({ title: { $all: ['Aristocats'] } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);

            BlogPostB.find({ title: { $all: [/^Aristocats/] } }, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);

              BlogPostB.find({ tags: { $all: ['onex', 'twox', 'threex'] } }, function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);

                BlogPostB.find({ tags: { $all: [/^onex/i] } }, function(err, docs) {
                  assert.ifError(err);
                  assert.equal(docs.length, 1);

                  BlogPostB.findOne({ tags: { $all: /^two/ } }, function(err, doc) {
                    assert.ifError(err);
                    assert.equal(post.id, doc.id);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('using #nor with nested #elemMatch', function(done) {
      const p0 = { title: 'nested $nor elemMatch1', comments: [] };

      const p1 = { title: 'nested $nor elemMatch0', comments: [] };
      p1.comments.push({ title: 'comment X' }, { title: 'comment Y' }, { title: 'comment W' });

      const P = BlogPostB;

      P.create(p0, p1, function(err, post0, post1) {
        assert.ifError(err);

        const id = post1.comments[1]._id;

        const query0 = { comments: { $elemMatch: { title: 'comment Z' } } };
        const query1 = { comments: { $elemMatch: { _id: id.toString(), title: 'comment Y' } } };

        P.find({ $nor: [query0, query1] }, function(err, posts) {
          assert.ifError(err);
          assert.equal(posts.length, 1);
          assert.equal(posts[0].id, post0.id);
          done();
        });
      });
    });

    it('strings via regexp', function(done) {
      BlogPostB.create({ title: 'Next to Normal' }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({ title: /^Next/ }, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          const reg = '^Next to Normal$';

          BlogPostB.find({ title: { $regex: reg } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), created._id);

            BlogPostB.findOne({ title: { $regex: reg } }, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.where('title').regex(reg).findOne(function(err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);

                BlogPostB.where('title').regex(/^Next/).findOne(function(err, found) {
                  assert.ifError(err);
                  assert.equal(found._id.toString(), created._id);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('a document whose arrays contain at least $all values', function(done) {
      const a1 = { numbers: [-1, -2, -3, -4], meta: { visitors: 4 } };
      const a2 = { numbers: [0, -1, -2, -3, -4] };
      BlogPostB.create(a1, a2, function(err, whereoutZero, whereZero) {
        assert.ifError(err);

        BlogPostB.find({ numbers: { $all: [-1, -2, -3, -4] } }, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 2);
          BlogPostB.find({ 'meta.visitors': { $all: [4] } }, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), whereoutZero._id);
            BlogPostB.find({ numbers: { $all: [0, -1] } }, function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 1);
              assert.equal(found[0]._id.toString(), whereZero._id);
              done();
            });
          });
        });
      });
    });

    it('where $size', function(done) {
      BlogPostB.create({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, function(err) {
        assert.ifError(err);
        BlogPostB.create({ numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }, function(err) {
          assert.ifError(err);
          BlogPostB.create({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, function(err) {
            assert.ifError(err);
            BlogPostB.find({ numbers: { $size: 10 } }, function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              BlogPostB.find({ numbers: { $size: 11 } }, function(err, found) {
                assert.ifError(err);
                assert.equal(found.length, 1);
                done();
              });
            });
          });
        });
      });
    });

    it('$gt, $lt, $lte, $gte work on strings', function(done) {
      const D = db.model('Test', new Schema({ dt: String }));

      D.create({ dt: '2011-03-30' }, cb);
      D.create({ dt: '2011-03-31' }, cb);
      D.create({ dt: '2011-04-01' }, cb);
      D.create({ dt: '2011-04-02' }, cb);

      let pending = 4;

      function cb(err) {
        assert.ifError(err);

        if (--pending) {
          return;
        }

        pending = 2;

        D.find({ dt: { $gte: '2011-03-30', $lte: '2011-04-01' } }).sort('dt').exec(function(err, docs) {
          if (!--pending) {
            done();
          }
          assert.ifError(err);
          assert.equal(docs.length, 3);
          assert.equal(docs[0].dt, '2011-03-30');
          assert.equal(docs[1].dt, '2011-03-31');
          assert.equal(docs[2].dt, '2011-04-01');
          assert.ok(!docs.some(function(d) {
            return d.dt === '2011-04-02';
          }));
        });

        D.find({ dt: { $gt: '2011-03-30', $lt: '2011-04-02' } }).sort('dt').exec(function(err, docs) {
          if (!--pending) {
            done();
          }
          assert.ifError(err);
          assert.equal(docs.length, 2);
          assert.equal(docs[0].dt, '2011-03-31');
          assert.equal(docs[1].dt, '2011-04-01');
          assert.ok(!docs.some(function(d) {
            return d.dt === '2011-03-30';
          }));
          assert.ok(!docs.some(function(d) {
            return d.dt === '2011-04-02';
          }));
        });
      }
    });

    describe('text search indexes', function() {
      it('works with text search ensure indexes ', function(done) {
        if (!mongo26_or_greater) {
          return done();
        }

        const blogPost = BlogPostB;

        blogPost.collection.createIndex({ title: 'text' }, function(error) {
          assert.ifError(error);
          const a = new blogPost({ title: 'querying in mongoose' });
          const b = new blogPost({ title: 'text search in mongoose' });
          a.save(function(error) {
            assert.ifError(error);
            b.save(function(error) {
              assert.ifError(error);
              blogPost.
                find({ $text: { $search: 'text search' } }, { score: { $meta: 'textScore' } }).
                limit(2).
                exec(function(error, documents) {
                  assert.ifError(error);
                  assert.equal(documents.length, 1);
                  assert.equal(documents[0].title, 'text search in mongoose');
                  a.remove({}, function(error) {
                    assert.ifError(error);
                    b.remove({}, function(error) {
                      assert.ifError(error);
                      done();
                    });
                  });
                });
            });
          });
        });
      });

      it('works when text search is called by a schema (gh-3824) (gh-6851)', async function() {
        if (!mongo26_or_greater) {
          return this.skip();
        }

        const exampleSchema = new Schema({
          title: String,
          name: { type: String, text: true },
          tag: String
        });

        const Example = db.model('Test', exampleSchema);

        await Example.init(); // Wait for index build
        // Should not error
        await Example.findOne({ $text: { $search: 'text search' } });

        await Example.create({ name: '1234 ABCD', tag: 'test1' });
        let doc = await Example.findOne({
          $text: {
            $search: 1234 // Will be casted to a string
          }
        });
        assert.ok(doc);
        assert.equal(doc.tag, 'test1');

        doc = await Example.findOne({
          $text: {
            $search: 'abcd',
            $caseSensitive: 'no' // Casted to boolean
          }
        });
        assert.ok(doc);
        assert.equal(doc.tag, 'test1');
      });
    });
  });

  describe('limit', function() {
    it('works', function(done) {
      BlogPostB.create({ title: 'first limit' }, function(err, first) {
        assert.ifError(err);
        BlogPostB.create({ title: 'second limit' }, function(err, second) {
          assert.ifError(err);
          BlogPostB.create({ title: 'third limit' }, function(err) {
            assert.ifError(err);
            BlogPostB.find({ title: /limit$/ }).limit(2).find(function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              assert.equal(found[0].id, first.id);
              assert.equal(found[1].id, second.id);
              done();
            });
          });
        });
      });
    });
  });

  describe('skip', function() {
    it('works', function(done) {
      BlogPostB.create({ title: '1 skip' }, function(err) {
        assert.ifError(err);
        BlogPostB.create({ title: '2 skip' }, function(err, second) {
          assert.ifError(err);
          BlogPostB.create({ title: '3 skip' }, function(err, third) {
            assert.ifError(err);
            BlogPostB.find({ title: /skip$/ }).sort({ title: 1 }).skip(1).limit(2).find(function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              assert.equal(found[0].id, second._id);
              assert.equal(found[1].id, third._id);
              done();
            });
          });
        });
      });
    });
  });

  describe('sort', function() {
    it('works', function(done) {
      BlogPostB.create({ meta: { visitors: 100 } }, function(err, least) {
        assert.ifError(err);
        BlogPostB.create({ meta: { visitors: 300 } }, function(err, largest) {
          assert.ifError(err);
          BlogPostB.create({ meta: { visitors: 200 } }, function(err, middle) {
            assert.ifError(err);
            BlogPostB
              .where('meta.visitors').gt(99).lt(301)
              .sort('-meta.visitors')
              .find(function(err, found) {
                assert.ifError(err);
                assert.equal(found.length, 3);
                assert.equal(found[0].id, largest._id);
                assert.equal(found[1].id, middle._id);
                assert.equal(found[2].id, least._id);
                done();
              });
          });
        });
      });
    });
    it('handles sorting by text score', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      const blogPost = BlogPostB;

      blogPost.collection.createIndex({ title: 'text' }, function(error) {
        assert.ifError(error);
        const a = new blogPost({ title: 'searching in mongoose' });
        const b = new blogPost({ title: 'text search in mongoose' });
        a.save(function(error) {
          assert.ifError(error);
          b.save(function(error) {
            assert.ifError(error);
            blogPost.
              find({ $text: { $search: 'text search' } }, { score: { $meta: 'textScore' } }).
              sort({ score: { $meta: 'textScore' } }).
              limit(2).
              exec(function(error, documents) {
                assert.ifError(error);
                assert.equal(documents.length, 2);
                assert.equal(documents[0].title, 'text search in mongoose');
                assert.equal(documents[1].title, 'searching in mongoose');
                done();
              });
          });
        });
      });
    });
  });

  describe('nested mixed "x.y.z"', function() {
    it('works', function(done) {
      BlogPostB.find({ 'mixed.nested.stuff': 'skynet' }, function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  it('by Date (gh-336)', function(done) {
    const Test = db.model('Test', new Schema({ date: Date }));
    const now = new Date();

    Test.create({ date: now }, { date: new Date(now - 10000) }, function(err) {
      assert.ifError(err);
      Test.find({ date: now }, function(err, docs) {
        assert.ifError(err);
        assert.equal(docs.length, 1);
        done();
      });
    });
  });

  it('mixed types with $elemMatch (gh-591)', function(done) {
    const S = new Schema({ a: [{}], b: Number });
    const M = db.model('Test', S);

    const m = new M();
    m.a = [1, 2, { name: 'Frodo' }, 'IDK', { name: 100 }];
    m.b = 10;

    m.save(function(err) {
      assert.ifError(err);

      M.find({ a: { name: 'Frodo' }, b: '10' }, function(err, docs) {
        assert.ifError(err);
        assert.equal(docs[0].a.length, 5);
        assert.equal(docs[0].b.valueOf(), 10);

        const query = {
          a: {
            $elemMatch: { name: 100 }
          }
        };

        M.find(query, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].a.length, 5);
          done();
        });
      });
    });
  });

  describe('$all', function() {
    it('with ObjectIds (gh-690)', function(done) {
      const SSchema = new Schema({ name: String });
      const PSchema = new Schema({ sub: [SSchema] });

      const P = db.model('Test', PSchema);
      const sub = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];

      P.create({ sub: sub }, function(err, p) {
        assert.ifError(err);

        const o0 = p.sub[0]._id;
        const o1 = p.sub[1]._id;
        const o2 = p.sub[2]._id;

        P.findOne({ 'sub._id': { $all: [o1, o2.toString()] } }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.id, p.id);

          P.findOne({ 'sub._id': { $all: [o0, new DocumentObjectId()] } }, function(err, doc) {
            assert.ifError(err);
            assert.equal(!!doc, false);

            P.findOne({ 'sub._id': { $all: [o2] } }, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              done();
            });
          });
        });
      });
    });

    it('with Dates', function(done) {
      this.timeout(4500);
      const SSchema = new Schema({ d: Date });
      const PSchema = new Schema({ sub: [SSchema] });

      const P = db.model('Test', PSchema);
      const sub = [
        { d: new Date() },
        { d: new Date(Date.now() - 10000) },
        { d: new Date(Date.now() - 30000) }
      ];

      P.create({ sub: sub }, function(err, p) {
        assert.ifError(err);

        const o0 = p.sub[0].d;
        const o1 = p.sub[1].d;
        const o2 = p.sub[2].d;

        P.findOne({ 'sub.d': { $all: [o1, o2] } }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.id, p.id);

          P.findOne({ 'sub.d': { $all: [o0, new Date()] } }, function(err, doc) {
            assert.ifError(err);
            assert.equal(!!doc, false);

            P.findOne({ 'sub.d': { $all: [o2] } }, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              done();
            });
          });
        });
      });
    });

    it('with $elemMatch (gh-3163)', async function() {
      const version = await start.mongodVersion();

      const mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      if (!mongo26_or_greater) {
        return;
      }


      const schema = new Schema({ test: [String] });
      const MyModel = db.model('Test', schema);

      await MyModel.create({ test: ['log1', 'log2'] });

      const docs = await MyModel.find({
        test: {
          $all: [
            { $elemMatch: { $regex: /log/g } }
          ]
        }
      });

      assert.equal(docs.length, 1);
    });
  });

  describe('and', function() {
    it('works with queries gh-1188', function(done) {
      const B = BlogPostB;
      B.create({ title: 'and operator', published: false, author: 'Me' }, function(err) {
        assert.ifError(err);

        B.find({ $and: [{ title: 'and operator' }] }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);

          B.find({ $and: [{ title: 'and operator' }, { published: true }] }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 0);

            B.find({ $and: [{ title: 'and operator' }, { published: false }] }, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);

              const query = B.find();
              query.and([
                { title: 'and operator', published: false },
                { author: 'Me' }
              ]);
              query.exec(function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);

                const query = B.find();
                query.and([
                  { title: 'and operator', published: false },
                  { author: 'You' }
                ]);
                query.exec(function(err, docs) {
                  assert.ifError(err);
                  assert.equal(docs.length, 0);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('works with nested query selectors gh-1884', function(done) {
      const B = db.model('Test', { a: String, b: String });

      B.deleteOne({ $and: [{ a: 'coffee' }, { b: { $in: ['bacon', 'eggs'] } }] }, function(error) {
        assert.ifError(error);
        done();
      });
    });
  });

  it('works with different methods and query types', function(done) {
    const BufSchema = new Schema({ name: String, block: Buffer });
    const Test = db.model('Test', BufSchema);

    const docA = { name: 'A', block: Buffer.from('über') };
    const docB = { name: 'B', block: Buffer.from('buffer shtuffs are neat') };
    const docC = { name: 'C', block: 'hello world' };
    const docD = { name: 'D', block: { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } };

    Test.create(docA, docB, docC, docD, function(err, a, b, c, d) {
      assert.ifError(err);

      assert.equal(a.block.toString('utf8'), 'über');
      assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
      assert.equal(c.block.toString('utf8'), 'hello world');
      assert.equal(d.block.toString('utf8'), 'gh-6863');

      Test.findById(a._id, function(err, a) {
        assert.ifError(err);
        assert.equal(a.block.toString('utf8'), 'über');

        Test.findOne({ block: 'buffer shtuffs are neat' }, function(err, rb) {
          assert.ifError(err);
          assert.equal(rb.block.toString('utf8'), 'buffer shtuffs are neat');

          Test.findOne({ block: /buffer/i }, function(err) {
            assert.equal(err.message, 'Cast to Buffer failed for value ' +
              '"/buffer/i" (type RegExp) at path "block" for model "Test"');
            Test.findOne({ block: [195, 188, 98, 101, 114] }, function(err, rb) {
              assert.ifError(err);
              assert.equal(rb.block.toString('utf8'), 'über');

              Test.findOne({ block: 'aGVsbG8gd29ybGQ=' }, function(err, rb) {
                assert.ifError(err);
                assert.strictEqual(rb, null);

                Test.findOne({ block: Buffer.from('aGVsbG8gd29ybGQ=', 'base64') }, function(err, rb) {
                  assert.ifError(err);
                  assert.equal(rb.block.toString('utf8'), 'hello world');

                  Test.findOne({ block: { type: 'Buffer', data: [195, 188, 98, 101, 114] } }, function(err, rb) {
                    assert.ifError(err);
                    assert.equal(rb.block.toString('utf8'), 'über');

                    Test.deleteOne({}, function(err) {
                      assert.ifError(err);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('with conditionals', async function() {
    // $in $nin etc
    const BufSchema = new Schema({ name: String, block: Buffer });
    const Test = db.model('Test', BufSchema);

    const docA = { name: 'A', block: new MongooseBuffer([195, 188, 98, 101, 114]) }; // über
    const docB = { name: 'B', block: new MongooseBuffer('buffer shtuffs are neat') };
    const docC = { name: 'C', block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') };
    const docD = { name: 'D', block: new MongooseBuffer({ type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] }) };

    const [a, b, c, d] = await Test.create([docA, docB, docC, docD]);


    assert.equal(a.block.toString('utf8'), 'über');
    assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
    assert.equal(c.block.toString('utf8'), 'hello world');
    assert.equal(d.block.toString('utf8'), 'gh-6863');


    // run all of the tests in parallel
    await Promise.all([
      Test.find({ block: {
        $in: [
          [195, 188, 98, 101, 114],
          'buffer shtuffs are neat',
          Buffer.from('aGVsbG8gd29ybGQ=', 'base64'),
          { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } // gh-6863
        ] } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $in: ['über', 'hello world'] } }).exec().then(tests => {
        assert.equal(tests.length, 2);
      }),
      Test.find({ block: { $in: ['über'] } }).exec().then(tests => {
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'über');
      }),
      Test.find({ block: { $nin: ['über'] } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: {
        $nin: [
          [195, 188, 98, 101, 114],
          Buffer.from('aGVsbG8gd29ybGQ=', 'base64'),
          { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } // gh-6863
        ] } }).exec().then(tests => {
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'buffer shtuffs are neat');
      }),
      Test.find({ block: { $ne: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: { $gt: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: { $gte: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $lt: Buffer.from('buffer shtuffs are neat') } }).exec().then(tests => {
        assert.equal(tests.length, 3);
        const ret = {};
        ret[tests[0].block.toString('utf8')] = 1;
        ret[tests[1].block.toString('utf8')] = 1;
        ret[tests[2].block.toString('utf8')] = 1;

        assert.ok(ret['über'] !== undefined);
      }),
      Test.find({ block: { $lte: 'buffer shtuffs are neat' } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $gt: { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } } }).exec().then(tests => {
        assert.equal(tests.length, 2);
      })
    ]);
    await Test.deleteOne({});
  });

  it('with previously existing null values in the db', function(done) {
    const post = new BlogPostB();

    const doc = { meta: { visitors: 9898, a: null } };
    post.collection.insertOne(doc, {}, function(err) {
      assert.ifError(err);

      BlogPostB.findOne({ _id: doc._id }, function(err, found) {
        assert.ifError(err);
        assert.equal(found.get('meta.visitors').valueOf(), 9898);
        done();
      });
    });
  });

  it('with unused values in the db', function(done) {
    const post = new BlogPostB();

    const doc = { meta: { visitors: 9898, color: 'blue' } };
    post.collection.insertOne(doc, {}, function(err) {
      assert.ifError(err);

      BlogPostB.findOne({ _id: doc._id }, function(err, found) {
        assert.ifError(err);
        assert.equal(found.get('meta.visitors').valueOf(), 9898);
        found.save(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  describe('2d', function() {
    it('$near (gh-309)', function(done) {
      const Test = db.model('Test', geoSchema);

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

      Test.on('index', complete);
      Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

      function test() {
        Test.find({ loc: { $near: [30, 40] } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('$within arrays (gh-586)', function(done) {
      const Test = db.model('Test', geoSchema);

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

      Test.on('index', complete);
      Test.create({ loc: [35, 50] }, { loc: [-40, -90] }, complete);

      function test() {
        Test.find({ loc: { $within: { $box: [[30, 40], [40, 60]] } } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          done();
        });
      }
    });

    it('$nearSphere with arrays (gh-610)', function(done) {
      const Test = db.model('Test', geoSchema);

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

      Test.on('index', complete);
      Test.create({ loc: [10, 20] }, { loc: [40, 90] }, complete);

      function test() {
        Test.find({ loc: { $nearSphere: [30, 40] } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('$nearSphere with invalid coordinate does not crash (gh-1874)', function(done) {
      const geoSchema = new Schema({
        loc: {
          type: { type: String },
          coordinates: { type: [Number], index: '2dsphere' }
        }
      });
      const Test = db.model('Test', geoSchema);

      let pending = 2;
      const complete = function(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          done(complete.ran = err);
          return;
        }
        --pending || test();
      };

      Test.on('index', complete);
      Test.create(
        { loc: { coordinates: [30, 41] } },
        { loc: { coordinates: [31, 40] } },
        complete);

      const test = function() {
        const q = new Query({}, {}, null, Test.collection);
        q.find({
          loc: {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [30, 40] },
              $maxDistance: 10000000
            }
          }
        });

        assert.doesNotThrow(function() {
          q.cast(Test);
        });

        done();
      };
    });

    it('$maxDistance with arrays', function(done) {
      const Test = db.model('Test', geoSchema);

      let pending = 2;

      function complete(err) {
        if (complete.ran) {
          return;
        }
        if (err) {
          done(complete.ran = err);
          return;
        }
        --pending || test();
      }

      Test.on('index', complete);
      Test.create({ loc: [20, 80] }, { loc: [25, 30] }, complete);

      function test() {
        Test.find({ loc: { $near: [25, 31], $maxDistance: 1 } }, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          Test.find({ loc: { $near: [25, 32], $maxDistance: 1 } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 0);
            done();
          });
        });
      }
    });
  });

  describe('2dsphere', function() {
    let schema2dsphere;
    let geoSchema;
    let geoMultiSchema;

    before(function() {
      schema2dsphere = new Schema({ loc: { type: [Number], index: '2dsphere' } });

      geoSchema = new Schema({ line: { type: { type: String }, coordinates: [] } });
      geoSchema.index({ line: '2dsphere' });

      geoMultiSchema = new Schema({ geom: [{ type: { type: String }, coordinates: [] }] });
      // see mongodb issue SERVER-8907
      // geoMultiSchema.index({ geom: '2dsphere' });
    });

    // mongodb 2.4
    let mongo24_or_greater = false;
    before(async function() {
      const version = await start.mongodVersion();

      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);

      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 features');
      }
    });

    it('index is allowed in schema', function(done) {
      if (!mongo24_or_greater) {
        return done();
      }

      const ok = schema2dsphere.indexes().some(function(index) {
        return index[0].loc === '2dsphere';
      });
      assert.ok(ok);
      done();
    });

    describe('$geometry', function() {
      it('Polygon', async function() {
        if (!mongo24_or_greater) {
          return;
        }

        const Test = db.model('Test', schema2dsphere);
        await Test.init();

        const created = await Test.create({ loc: [0, 0] });

        const geojsonPoly = { type: 'Polygon', coordinates: [[[-5, -5], ['-5', 5], [5, 5], [5, -5], [-5, '-5']]] };

        const docs = await Test.find({ loc: { $within: { $geometry: geojsonPoly } } });

        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const geoDocs = await Test.where('loc').within().geometry(geojsonPoly).exec();

        assert.equal(geoDocs.length, 1);
        assert.equal(created.id, geoDocs[0].id);
      });
    });

    describe('$geoIntersects', function() {
      it('LineString', async function() {
        if (!mongo24_or_greater) {
          return;
        }

        const Test = db.model('Test', geoSchema);
        await Test.init();


        const created = await Test.create({ line: { type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]] } });

        const geojsonLine = { type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']] };

        const docs = await Test.find({ line: { $geoIntersects: { $geometry: geojsonLine } } });

        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const doc = await Test.where('line').intersects().geometry(geojsonLine).findOne();

        assert.equal(created.id, doc.id);
      });

      it('MultiLineString', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        const Test = db.model('Test', geoMultiSchema);

        Test.create({
          geom: [{ type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]] },
            { type: 'LineString', coordinates: [[-178.0, 5.0], [178.0, 5.0]] }]
        }, function(err, created) {
          assert.ifError(err);

          const geojsonLine = { type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']] };

          Test.find({ geom: { $geoIntersects: { $geometry: geojsonLine } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(created.id, docs[0].id);

            Test.where('geom').intersects().geometry(geojsonLine).findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(created.id, doc.id);
              done();
            });
          });
        });
      });

      it('MultiPolygon', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        const Test = db.model('Test', geoMultiSchema);

        Test.create({
          geom: [{ type: 'Polygon', coordinates: [[[28.7, 41], [29.2, 40.9], [29.1, 41.3], [28.7, 41]]] },
            { type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]] }]
        }, function(err, created) {
          assert.ifError(err);

          const geojsonPolygon = { type: 'Polygon', coordinates: [[[26, 36], [45, 36], [45, 42], [26, 42], [26, 36]]] };

          Test.find({ geom: { $geoIntersects: { $geometry: geojsonPolygon } } }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(created.id, docs[0].id);

            Test.where('geom').intersects().geometry(geojsonPolygon).findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(created.id, doc.id);
              done();
            });
          });
        });
      });
    });

    describe('$near', function() {
      it('Point', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        const Test = db.model('Test', geoSchema);

        Test.on('index', function(err) {
          assert.ifError(err);

          Test.create({ line: { type: 'Point', coordinates: [-179.0, 0.0] } }, function(err, created) {
            assert.ifError(err);

            const geojsonPoint = { type: 'Point', coordinates: [-179.0, 0.0] };

            Test.find({ line: { $near: geojsonPoint } }, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);
              assert.equal(created.id, docs[0].id);

              Test.find({ line: { $near: { $geometry: geojsonPoint, $maxDistance: 50 } } }, function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);
                assert.equal(created.id, docs[0].id);
                done();
              });
            });
          });
        });
      });

      it('works with GeoJSON (gh-1482)', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        const geoJSONSchema = new Schema({ loc: { type: { type: String }, coordinates: [Number] } });
        geoJSONSchema.index({ loc: '2dsphere' });
        const Test = db.model('Test', geoJSONSchema);

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

        Test.on('index', complete);
        Test.create({ loc: { type: 'Point', coordinates: [10, 20] } }, {
          loc: {
            type: 'Point', coordinates: [40, 90]
          }
        }, complete);

        function test() {
          // $maxDistance is in meters... so even though they aren't that far off
          // in lat/long, need an incredibly high number here
          Test.where('loc').near({
            center: {
              type: 'Point', coordinates: [11, 20]
            }, maxDistance: 1000000
          }).exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
      it('works with legacy 2dsphere pair in schema (gh-6937)', async function() {
        if (!mongo24_or_greater) {
          return it.skip();
        }

        const Model = db.model('Test', schema2dsphere);
        await Model.init();
        const model = new Model();
        model.loc = [1, 2];
        await model.save();
        const result = await Model.where('loc').near({ center: { type: 'Point', coordinates: [1, 2] }, maxDistance: 10 });
        assert.equal(result.length, 1);
      });
    });
  });

  describe('hashed indexes', function() {
    let mongo24_or_greater = false;

    before(async function() {
      const version = await start.mongodVersion();

      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 features');
      }
    });

    it('work', function(done) {
      if (!mongo24_or_greater) {
        return done();
      }

      const schema = new Schema({ t: { type: String, index: 'hashed' } });

      const H = db.model('Test', schema);
      H.on('index', function(err) {
        assert.ifError(err);
        H.collection.getIndexes({ full: true }, function(err, indexes) {
          assert.ifError(err);

          const found = indexes.some(function(index) {
            return index.key.t === 'hashed';
          });
          assert.ok(found);

          H.create({ t: 'hashing' }, {}, function(err, doc1, doc2) {
            assert.ifError(err);
            assert.ok(doc1);
            assert.ok(doc2);
            done();
          });
        });
      });
    });
  });

  describe('lean', function() {
    it('find', function(done) {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);
        BlogPostB.find({ title: title }).lean().exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0] instanceof mongoose.Document, false);
          BlogPostB.find({ title: title }, null, { lean: true }, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.strictEqual(docs[0] instanceof mongoose.Document, false);
            done();
          });
        });
      });
    });

    it('removes the __v property if versionKey: false is set (gh-8934)', async function() {
      const title = 'Wooooot ' + random();
      await BlogPostB.create({ title });
      const foundPost = await BlogPostB.find({ title }).lean({ versionKey: false });
      assert.ok(!('__v' in foundPost));
      const anotherFoundPost = await BlogPostB.findOne({ title }).lean({ versionKey: false });
      assert.ok(!('__v' in anotherFoundPost));
      const updateFoundPost = await BlogPostB.findOneAndUpdate({ title: title }, { title: 'Woooot' }).lean({ versionKey: false });
      assert.ok(!('__v' in updateFoundPost));
    });

    it('findOne', function(done) {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);
        BlogPostB.findOne({ title: title }, null, { lean: true }, function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);
          assert.strictEqual(false, doc instanceof mongoose.Document);
          done();
        });
      });
    });
    it('properly casts nested and/or queries (gh-676)', function(done) {
      const sch = new Schema({
        num: Number,
        subdoc: { title: String, num: Number }
      });

      const M = db.model('Test', sch);

      const cond = {
        $and: [
          { $or: [{ num: '23' }, { 'subdoc.num': '45' }] },
          { $and: [{ 'subdoc.title': 233 }, { num: '345' }] }
        ]
      };
      const q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[1]['subdoc.num'], 'number');
      assert.equal(typeof q._conditions.$and[1].$and[0]['subdoc.title'], 'string');
      assert.equal(typeof q._conditions.$and[1].$and[1].num, 'number');
      done();
    });
    it('properly casts deeply nested and/or queries (gh-676)', function(done) {
      const sch = new Schema({
        num: Number,
        subdoc: { title: String, num: Number }
      });

      const M = db.model('Test', sch);

      const cond = {
        $and: [{ $or: [{ $and: [{ $or: [{ num: '12345' }, { 'subdoc.num': '56789' }] }] }] }]
      };
      const q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[1]['subdoc.num'], 'number');
      done();
    });

    it('casts $elemMatch (gh-2199)', function(done) {
      const schema = new Schema({ dates: [Date] });
      const Dates = db.model('Test', schema);

      const array = ['2014-07-01T02:00:00.000Z', '2014-07-01T04:00:00.000Z'];
      Dates.create({ dates: array }, function(err) {
        assert.ifError(err);
        const elemMatch = { $gte: '2014-07-01T03:00:00.000Z' };
        Dates.findOne({}, { dates: { $elemMatch: elemMatch } }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.dates.length, 1);
          assert.equal(doc.dates[0].getTime(),
            new Date('2014-07-01T04:00:00.000Z').getTime());
          done();
        });
      });
    });

    it('does not run resetId setter on query (gh-6093)', function() {
      const schema = new Schema({});

      const Test = db.model('Test', schema);

      return Test.find({ _id: { $in: [void 0] } });
    });

    describe('$eq', function() {
      let mongo26 = false;

      before(async function() {
        const version = await start.mongodVersion();

        mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      });

      it('casts $eq (gh-2752)', function(done) {
        BlogPostB.findOne(
          { _id: { $eq: '000000000000000000000001' }, numbers: { $eq: [1, 2] } },
          function(err, doc) {
            if (mongo26) {
              assert.ifError(err);
            } else {
              assert.ok(err.toString().indexOf('MongoServerError') !== -1);
            }

            assert.ok(!doc);
            done();
          });
      });
    });
  });

  it('does not apply string schema setters on $regex (gh-11426)', async function() {
    const numbersOnlyRE = /[^\d]+/g;
    const getOnlyNumbers = string => string.replace(numbersOnlyRE, '');

    const testSchema = new Schema({
      testProp: {
        type: String,
        required: true,
        set: getOnlyNumbers
      }
    }, { strictQuery: false });

    const Test = db.model('Test', testSchema);

    await Test.collection.insertOne({ testProp: 'not numbers' });

    const res = await Test.find({ testProp: /^not numbers$/ });
    assert.equal(res.length, 1);
    assert.equal(res[0].testProp, 'not numbers');

    res[0].testProp = 'something else 42';
    assert.strictEqual(res[0].testProp, '42');
  });
});
