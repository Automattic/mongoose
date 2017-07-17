/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    MongooseBuffer = mongoose.Types.Buffer,
    DocumentObjectId = mongoose.Types.ObjectId,
    Query = require('../lib/query');

describe('model: querying:', function() {
  var Comments;
  var BlogPostB;
  var collection;
  var ModSchema;
  var geoSchema;

  before(function() {
    Comments = new Schema;

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
      def: {type: String, default: 'kandinsky'}
    });

    mongoose.model('BlogPostB', BlogPostB);
    collection = 'blogposts_' + random();

    ModSchema = new Schema({
      num: Number,
      str: String
    });
    mongoose.model('Mod', ModSchema);

    geoSchema = new Schema({loc: {type: [Number], index: '2d'}});
  });

  var mongo26_or_greater = false;
  before(function(done) {
    start.mongodVersion(function(err, version) {
      if (err) {
        throw err;
      }
      mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      if (!mongo26_or_greater) {
        console.log('not testing mongodb 2.6 features');
      }
      done();
    });
  });

  it('find returns a Query', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection);

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

    db.close(done);
  });

  it('findOne returns a Query', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection);

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

    db.close(done);
  });

  it('an empty find does not hang', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection);

    function fn() {
      db.close(done);
    }

    BlogPostB.find({}, fn);
  });

  it('a query is executed when a callback is passed', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection),
        count = 5,
        q = {_id: new DocumentObjectId}; // make sure the query is fast

    function fn() {
      if (--count) {
        return;
      }
      db.close(done);
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
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection),
        count = 5,
        q = {_id: new DocumentObjectId}; // make sure the query is fast

    function fn() {
      if (--count) {
        return;
      }
      db.close();
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

  describe('count', function() {
    it('returns a Query', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);
      assert.ok(BlogPostB.count({}) instanceof Query);
      db.close();
      done();
    });

    it('Query executes when you pass a callback', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          pending = 2;

      function fn() {
        if (--pending) {
          return;
        }
        db.close();
        done();
      }

      assert.ok(BlogPostB.count({}, fn) instanceof Query);
      assert.ok(BlogPostB.count(fn) instanceof Query);
    });

    it('counts documents', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        var post = new BlogPostB();
        post.set('title', title);

        post.save(function(err) {
          assert.ifError(err);

          BlogPostB.count({title: title}, function(err, count) {
            assert.ifError(err);

            assert.equal(typeof count, 'number');
            assert.equal(count, 2);

            db.close();
            done();
          });
        });
      });
    });
  });

  describe('distinct', function() {
    it('returns a Query', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      assert.ok(BlogPostB.distinct('title', {}) instanceof Query);
      db.close();
      done();
    });

    it('executes when you pass a callback', function(done) {
      var db = start();
      var Address = new Schema({zip: String});
      Address = db.model('Address', Address, 'addresses_' + random());

      Address.create({zip: '10010'}, {zip: '10010'}, {zip: '99701'}, function(err) {
        assert.strictEqual(null, err);
        var query = Address.distinct('zip', {}, function(err, results) {
          assert.ifError(err);
          assert.equal(results.length, 2);
          assert.ok(results.indexOf('10010') > -1);
          assert.ok(results.indexOf('99701') > -1);
          db.close(done);
        });
        assert.ok(query instanceof Query);
      });
    });

    it('permits excluding conditions gh-1541', function(done) {
      var db = start();
      var Address = new Schema({zip: String});
      Address = db.model('Address', Address, 'addresses_' + random());
      Address.create({zip: '10010'}, {zip: '10010'}, {zip: '99701'}, function(err) {
        assert.ifError(err);
        Address.distinct('zip', function(err, results) {
          assert.ifError(err);
          assert.equal(results.length, 2);
          assert.ok(results.indexOf('10010') > -1);
          assert.ok(results.indexOf('99701') > -1);
          db.close(done);
        });
      });
    });
  });

  describe('update', function() {
    it('returns a Query', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      assert.ok(BlogPostB.update({}, {}) instanceof Query);
      assert.ok(BlogPostB.update({}, {}, {}) instanceof Query);
      db.close();
      done();
    });

    it('Query executes when you pass a callback', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          count = 2;

      function fn() {
        if (--count) {
          return;
        }
        db.close();
        done();
      }

      assert.ok(BlogPostB.update({title: random()}, {}, fn) instanceof Query);
      assert.ok(BlogPostB.update({title: random()}, {}, {}, fn) instanceof Query);
    });

    it('can handle minimize option (gh-3381)', function(done) {
      var db = start();
      var Model = db.model('gh3381', {
        name: String,
        mixed: Schema.Types.Mixed
      });

      var query = Model.update({}, {mixed: {}, name: 'abc'},
          {minimize: true});

      assert.ok(!query._update.$set.mixed);

      db.close(done);
    });
  });

  describe('findOne', function() {
    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({title: title}, function(err, doc) {
          assert.ifError(err);
          assert.equal(title, doc.get('title'));
          assert.equal(doc.isNew, false);

          db.close();
          done();
        });
      });
    });

    it('casts $modifiers', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          post = new BlogPostB({
            meta: {
              visitors: -10
            }
          });

      post.save(function(err) {
        assert.ifError(err);

        var query = {'meta.visitors': {$gt: '-20', $lt: -1}};
        BlogPostB.findOne(query, function(err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(found.get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
          found.id; // trigger caching
          assert.equal(found.get('_id').toString(), post.get('_id'));
          db.close();
          done();
        });
      });
    });

    it('querying if an array contains one of multiple members $in a set', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB();

      post.tags.push('football');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({tags: {$in: ['football', 'baseball']}}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(), post._id);

          BlogPostB.findOne({_id: post._id, tags: /otba/i}, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc._id.toString(), post._id);
            db.close();
            done();
          });
        });
      });
    });

    it('querying if an array contains one of multiple members $in a set 2', function(done) {
      var db = start(),
          BlogPostA = db.model('BlogPostB', collection);

      var post = new BlogPostA({tags: ['gooberOne']});

      post.save(function(err) {
        assert.ifError(err);

        var query = {tags: {$in: ['gooberOne']}};

        BlogPostA.findOne(query, function(err, returned) {
          cb();
          assert.ifError(err);
          assert.ok(!!~returned.tags.indexOf('gooberOne'));
          assert.equal(returned._id.toString(), post._id);
        });
      });

      post.collection.insert({meta: {visitors: 9898, a: null}}, {}, function(err, b) {
        assert.ifError(err);

        BlogPostA.findOne({_id: b.ops[0]._id}, function(err, found) {
          cb();
          assert.ifError(err);
          assert.equal(found.get('meta.visitors'), 9898);
        });
      });

      var pending = 2;

      function cb() {
        if (--pending) {
          return;
        }
        db.close();
        done();
      }
    });

    it('querying via $where a string', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'Steve Jobs', author: 'Steve Jobs'}, function(err, created) {
        assert.ifError(err);

        BlogPostB.findOne({$where: 'this.title && this.title === this.author'}, function(err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(), created._id);
          db.close();
          done();
        });
      });
    });

    it('querying via $where a function', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({author: 'Atari', slug: 'Atari'}, function(err, created) {
        assert.ifError(err);

        BlogPostB.findOne({
          $where: function() {
            return (this.author && this.slug && this.author === this.slug);
          }
        }, function(err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(), created._id);
          db.close();
          done();
        });
      });
    });

    it('based on nested fields', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          post = new BlogPostB({
            meta: {
              visitors: 5678
            }
          });

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({'meta.visitors': 5678}, function(err, found) {
          assert.ifError(err);
          assert.equal(found.get('meta.visitors')
          .valueOf(), post.get('meta.visitors').valueOf());
          assert.equal(found.get('_id').toString(), post.get('_id'));
          db.close();
          done();
        });
      });
    });

    it('based on embedded doc fields (gh-242, gh-463)', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({comments: [{title: 'i should be queryable'}], numbers: [1, 2, 33333], tags: ['yes', 'no']}, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({'comments.title': 'i should be queryable'}, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          BlogPostB.findOne({'comments.0.title': 'i should be queryable'}, function(err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);

            // GH-463
            BlogPostB.findOne({'numbers.2': 33333}, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.findOne({'tags.1': 'no'}, function(err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);
                db.close();
                done();
              });
            });
          });
        });
      });
    });

    it('works with nested docs and string ids (gh-389)', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({comments: [{title: 'i should be queryable by _id'}, {title: 'me too me too!'}]}, function(err, created) {
        assert.ifError(err);
        var id = created.comments[1]._id.toString();
        BlogPostB.findOne({'comments._id': id}, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.strictEqual(!!found, true, 'Find by nested doc id hex string fails');
          assert.equal(found._id.toString(), created._id);
          done();
        });
      });
    });

    it('using #all with nested #elemMatch', function(done) {
      var db = start(),
          P = db.model('BlogPostB', collection + '_nestedElemMatch');

      var post = new P({title: 'nested elemMatch'});
      post.comments.push({title: 'comment A'}, {title: 'comment B'}, {title: 'comment C'});

      var id1 = post.comments[1]._id;
      var id2 = post.comments[2]._id;

      post.save(function(err) {
        assert.ifError(err);

        var query0 = {$elemMatch: {_id: id1, title: 'comment B'}};
        var query1 = {$elemMatch: {_id: id2.toString(), title: 'comment C'}};

        P.findOne({comments: {$all: [query0, query1]}}, function(err, p) {
          db.close();
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('using #or with nested #elemMatch', function(done) {
      var db = start(),
          P = db.model('BlogPostB', collection);

      var post = new P({title: 'nested elemMatch'});
      post.comments.push({title: 'comment D'}, {title: 'comment E'}, {title: 'comment F'});

      var id1 = post.comments[1]._id;

      post.save(function(err) {
        assert.ifError(err);

        var query0 = {comments: {$elemMatch: {title: 'comment Z'}}};
        var query1 = {comments: {$elemMatch: {_id: id1.toString(), title: 'comment E'}}};

        P.findOne({$or: [query0, query1]}, function(err, p) {
          db.close();
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('buffer $in array', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({
        sigs: [new Buffer([1, 2, 3]),
          new Buffer([4, 5, 6]),
          new Buffer([7, 8, 9])]
      }, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({sigs: new Buffer([1, 2, 3])}, function(err, found) {
          assert.ifError(err);
          found.id;
          assert.equal(found._id.toString(), created._id);
          var query = {sigs: {'$in': [new Buffer([3, 3, 3]), new Buffer([4, 5, 6])]}};
          BlogPostB.findOne(query, function(err) {
            assert.ifError(err);
            db.close();
            done();
          });
        });
      });
    });

    it('regex with Array (gh-599)', function(done) {
      var db = start(),
          B = db.model('BlogPostB', random());

      B.create({tags: 'wooof baaaark meeeeow'.split(' ')}, function(err) {
        assert.ifError(err);
        B.findOne({tags: /ooof$/}, function(err, doc) {
          assert.ifError(err);
          assert.strictEqual(true, !!doc);
          assert.ok(!!~doc.tags.indexOf('meeeeow'));

          B.findOne({tags: {$regex: 'eow$'}}, function(err, doc) {
            db.close();
            assert.ifError(err);
            assert.strictEqual(true, !!doc);
            assert.strictEqual(true, !!~doc.tags.indexOf('meeeeow'));
            done();
          });
        });
      });
    });

    it('regex with options', function(done) {
      var db = start(),
          B = db.model('BlogPostB', collection);

      var post = new B({title: '$option queries'});
      post.save(function(err) {
        assert.ifError(err);
        B.findOne({title: {$regex: ' QUERIES$', $options: 'i'}}, function(err, doc) {
          db.close();
          assert.strictEqual(null, err, err && err.stack);
          assert.equal(doc.id, post.id);
          done();
        });
      });
    });

    it('works with $elemMatch and $in combo (gh-1100)', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          id1 = new DocumentObjectId,
          id2 = new DocumentObjectId;

      BlogPostB.create({owners: [id1, id2]}, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({owners: {'$elemMatch': {$in: [id2.toString()]}}}, function(err, found) {
          db.close();
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
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Edwald ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findById(undefined, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc, null);
          db.close(done);
        });
      });
    });

    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Edwald ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        var pending = 2;

        BlogPostB.findById(post.get('_id'), function(err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(doc.get('title'), title);
          if (--pending) {
            return;
          }
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id').toHexString(), function(err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(doc.get('title'), title);
          if (--pending) {
            return;
          }
          db.close();
          done();
        });
      });
    });

    it('works with partial initialization', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          queries = 5;

      var post = new BlogPostB();

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
          db.close();
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
          db.close();
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
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id'), {title: 1}, function(err, doc) {
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
          db.close();
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
          db.close();
          done();
        });
      });
    });

    it('querying if an array contains at least a certain single member (gh-220)', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB();

      post.tags.push('cat');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findOne({tags: 'cat'}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(), post._id);
          db.close();
          done();
        });
      });
    });


    it('where an array where the $slice operator', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({numbers: [500, 600, 700, 800]}, function(err, created) {
        assert.ifError(err);
        BlogPostB.findById(created._id, {numbers: {$slice: 2}}, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);
          assert.equal(found.numbers.length, 2);
          assert.equal(found.numbers[0], 500);
          assert.equal(found.numbers[1], 600);
          BlogPostB.findById(created._id, {numbers: {$slice: -2}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);
            assert.equal(found.numbers.length, 2);
            assert.equal(found.numbers[0], 700);
            assert.equal(found.numbers[1], 800);
            BlogPostB.findById(created._id, {numbers: {$slice: [1, 2]}}, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);
              assert.equal(found.numbers.length, 2);
              assert.equal(found.numbers[0], 600);
              assert.equal(found.numbers[1], 700);
              db.close();
              done();
            });
          });
        });
      });
    });
  });

  describe('find', function() {
    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);

        var post = new BlogPostB();
        post.set('title', title);

        post.save(function(err) {
          assert.ifError(err);

          BlogPostB.find({title: title}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 2);

            assert.equal(title, docs[0].get('title'));
            assert.equal(docs[0].isNew, false);

            assert.equal(title, docs[1].get('title'));
            assert.equal(docs[1].isNew, false);

            db.close();
            done();
          });
        });
      });
    });

    it('returns docs where an array that contains one specific member', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);
      BlogPostB.create({numbers: [100, 101, 102]}, function(err, created) {
        assert.ifError(err);
        BlogPostB.find({numbers: 100}, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 1);
          assert.equal(found[0]._id.toString(), created._id);
          db.close();
          done();
        });
      });
    });

    it('works when comparing $ne with single value against an array', function(done) {
      var db = start();
      var schema = new Schema({
        ids: [Schema.ObjectId],
        b: Schema.ObjectId
      });

      var NE = db.model('NE_Test', schema, 'nes__' + random());

      var id1 = new DocumentObjectId;
      var id2 = new DocumentObjectId;
      var id3 = new DocumentObjectId;
      var id4 = new DocumentObjectId;

      NE.create({ids: [id1, id4], b: id3}, function(err) {
        assert.ifError(err);
        NE.create({ids: [id2, id4], b: id3}, function(err) {
          assert.ifError(err);

          var query = NE.find({'b': id3.toString(), 'ids': {$ne: id1}});
          query.exec(function(err, nes1) {
            assert.ifError(err);
            assert.equal(nes1.length, 1);

            NE.find({b: {$ne: [1]}}, function(err) {
              assert.equal(err.message, 'Cast to ObjectId failed for value "[ 1 ]" at path "b" for model "NE_Test"');

              NE.find({b: {$ne: 4}}, function(err) {
                assert.equal(err.message, 'Cast to ObjectId failed for value "4" at path "b" for model "NE_Test"');

                NE.find({b: id3, ids: {$ne: id4}}, function(err, nes4) {
                  db.close();
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
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          queries = 4;

      var post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.find({_id: post.get('_id')}, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), true);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual('kandinsky', docs[0].def);
          if (--queries) {
            return;
          }
          db.close();
          done();
        });

        BlogPostB.find({_id: post.get('_id')}, 'title', function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), false);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          db.close();
          done();
        });

        BlogPostB.find({_id: post.get('_id')}, {slug: 0, def: 0}, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), true);
          assert.equal(docs[0].isInit('slug'), false);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          db.close();
          done();
        });

        BlogPostB.find({_id: post.get('_id')}, 'slug', function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].isInit('title'), false);
          assert.equal(docs[0].isInit('slug'), true);
          assert.equal(docs[0].isInit('date'), false);
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) {
            return;
          }
          db.close();
          done();
        });
      });
    });

    it('where $exists', function(done) {
      var db = start(),
          ExistsSchema = new Schema({
            a: Number,
            b: String
          });
      mongoose.model('Exists', ExistsSchema);
      var Exists = db.model('Exists', 'exists_' + random());
      Exists.create({a: 1}, function(err) {
        assert.ifError(err);
        Exists.create({b: 'hi'}, function(err) {
          assert.ifError(err);
          Exists.find({b: {$exists: true}}, function(err, docs) {
            assert.ifError(err);
            db.close();
            assert.equal(docs.length, 1);
            done();
          });
        });
      });
    });

    it('works with $elemMatch (gh-1100)', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          id1 = new DocumentObjectId,
          id2 = new DocumentObjectId;

      BlogPostB.create({owners: [id1, id2]}, function(err) {
        assert.ifError(err);
        BlogPostB.find({owners: {'$elemMatch': {$in: [id2.toString()]}}}, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.length, 1);
          done();
        });
      });
    });

    it('where $mod', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function(err, one) {
        assert.ifError(err);
        Mod.create({num: 2}, function(err) {
          assert.ifError(err);
          Mod.find({num: {$mod: [2, 1]}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
            db.close();
            done();
          });
        });
      });
    });

    it('where $not', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function(err) {
        assert.ifError(err);
        Mod.create({num: 2}, function(err, two) {
          assert.ifError(err);
          Mod.find({num: {$not: {$mod: [2, 1]}}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
            db.close();
            done();
          });
        });
      });
    });

    it('where or()', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'mods_' + random());

      Mod.create({num: 1}, {num: 2, str: 'two'}, function(err, one, two) {
        assert.ifError(err);

        var pending = 3;
        test1();
        test2();
        test3();

        function test1() {
          Mod.find({$or: [{num: 1}, {num: 2}]}, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 2);

            var found1 = false;
            var found2 = false;

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
          Mod.find({$or: [{str: 'two'}, {str: 'three'}]}, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
          });
        }

        function test3() {
          Mod.find({$or: [{num: 1}]}).or([{str: 'two'}]).exec(function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 2);

            var found1 = false;
            var found2 = false;

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
          db.close();
          done();
        }
      });
    });

    it('using $or with array of Document', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'mods_' + random());

      Mod.create({num: 1}, function(err, one) {
        assert.ifError(err);
        Mod.find({num: 1}, function(err, found) {
          assert.ifError(err);
          Mod.find({$or: found}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
            db.close();
            done();
          });
        });
      });
    });

    it('where $ne', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function(err) {
        assert.ifError(err);
        Mod.create({num: 2}, function(err, two) {
          assert.ifError(err);
          Mod.create({num: 3}, function(err, three) {
            assert.ifError(err);
            Mod.find({num: {$ne: 1}}, function(err, found) {
              assert.ifError(err);

              assert.equal(found.length, 2);
              assert.equal(found[0]._id.toString(), two._id);
              assert.equal(found[1]._id.toString(), three._id);
              db.close();
              done();
            });
          });
        });
      });
    });

    it('where $nor', function(done) {
      var db = start(),
          Mod = db.model('Mod', 'nor_' + random());

      Mod.create({num: 1}, {num: 2, str: 'two'}, function(err, one, two) {
        assert.ifError(err);

        var pending = 3;
        test1();
        test2();
        test3();

        function test1() {
          Mod.find({$nor: [{num: 1}, {num: 3}]}, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), two._id);
          });
        }

        function test2() {
          Mod.find({$nor: [{str: 'two'}, {str: 'three'}]}, function(err, found) {
            cb();
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), one._id);
          });
        }

        function test3() {
          Mod.find({$nor: [{num: 2}]}).nor([{str: 'two'}]).exec(function(err, found) {
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
          db.close();
          done();
        }
      });
    });

    it('STRICT null matches', function(done) {
      var db = start();
      var BlogPostB = db.model('BlogPostB', collection + random());

      var a = {title: 'A', author: null};
      var b = {title: 'B'};
      BlogPostB.create(a, b, function(err, createdA) {
        assert.ifError(err);
        BlogPostB.find({author: {$in: [null], $exists: true}}, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.length, 1);
          assert.equal(found[0]._id.toString(), createdA._id);
          done();
        });
      });
    });

    it('null matches null and undefined', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection + random());

      BlogPostB.create(
          {title: 'A', author: null},
          {title: 'B'}, function(err) {
            assert.ifError(err);
            BlogPostB.find({author: null}, function(err, found) {
              db.close();
              assert.ifError(err);
              assert.equal(found.length, 2);
              done();
            });
          });
    });

    it('a document whose arrays contain at least $all string values', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB({title: 'Aristocats'});

      post.tags.push('onex');
      post.tags.push('twox');
      post.tags.push('threex');

      post.save(function(err) {
        assert.ifError(err);

        BlogPostB.findById(post._id, function(err, post) {
          assert.ifError(err);

          BlogPostB.find({title: {'$all': ['Aristocats']}}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);

            BlogPostB.find({title: {'$all': [/^Aristocats/]}}, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);

              BlogPostB.find({tags: {'$all': ['onex', 'twox', 'threex']}}, function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);

                BlogPostB.find({tags: {'$all': [/^onex/i]}}, function(err, docs) {
                  assert.ifError(err);
                  assert.equal(docs.length, 1);

                  BlogPostB.findOne({tags: {'$all': /^two/}}, function(err, doc) {
                    db.close();
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
      var db = start(),
          P = db.model('BlogPostB', collection + '_norWithNestedElemMatch');

      var p0 = {title: 'nested $nor elemMatch1', comments: []};

      var p1 = {title: 'nested $nor elemMatch0', comments: []};
      p1.comments.push({title: 'comment X'}, {title: 'comment Y'}, {title: 'comment W'});

      P.create(p0, p1, function(err, post0, post1) {
        assert.ifError(err);

        var id = post1.comments[1]._id;

        var query0 = {comments: {$elemMatch: {title: 'comment Z'}}};
        var query1 = {comments: {$elemMatch: {_id: id.toString(), title: 'comment Y'}}};

        P.find({$nor: [query0, query1]}, function(err, posts) {
          db.close();
          assert.ifError(err);
          assert.equal(posts.length, 1);
          assert.equal(posts[0].id, post0.id);
          done();
        });
      });
    });

    it('strings via regexp', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'Next to Normal'}, function(err, created) {
        assert.ifError(err);
        BlogPostB.findOne({title: /^Next/}, function(err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          var reg = '^Next to Normal$';

          BlogPostB.find({title: {$regex: reg}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), created._id);

            BlogPostB.findOne({title: {$regex: reg}}, function(err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.where('title').regex(reg).findOne(function(err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);

                BlogPostB.where('title').regex(/^Next/).findOne(function(err, found) {
                  db.close();
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
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);
      var a1 = {numbers: [-1, -2, -3, -4], meta: {visitors: 4}};
      var a2 = {numbers: [0, -1, -2, -3, -4]};
      BlogPostB.create(a1, a2, function(err, whereoutZero, whereZero) {
        assert.ifError(err);

        BlogPostB.find({numbers: {$all: [-1, -2, -3, -4]}}, function(err, found) {
          assert.ifError(err);
          assert.equal(found.length, 2);
          BlogPostB.find({'meta.visitors': {$all: [4]}}, function(err, found) {
            assert.ifError(err);
            assert.equal(found.length, 1);
            assert.equal(found[0]._id.toString(), whereoutZero._id);
            BlogPostB.find({numbers: {$all: [0, -1]}}, function(err, found) {
              db.close();
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
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}, function(err) {
        assert.ifError(err);
        BlogPostB.create({numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}, function(err) {
          assert.ifError(err);
          BlogPostB.create({numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}, function(err) {
            assert.ifError(err);
            BlogPostB.find({numbers: {$size: 10}}, function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              BlogPostB.find({numbers: {$size: 11}}, function(err, found) {
                assert.ifError(err);
                assert.equal(found.length, 1);
                db.close();
                done();
              });
            });
          });
        });
      });
    });

    it('$gt, $lt, $lte, $gte work on strings', function(done) {
      var db = start();
      var D = db.model('D', new Schema({dt: String}), collection);

      D.create({dt: '2011-03-30'}, cb);
      D.create({dt: '2011-03-31'}, cb);
      D.create({dt: '2011-04-01'}, cb);
      D.create({dt: '2011-04-02'}, cb);

      var pending = 4;

      function cb(err) {
        if (err) {
          db.close();
        }
        assert.ifError(err);

        if (--pending) {
          return;
        }

        pending = 2;

        D.find({'dt': {$gte: '2011-03-30', $lte: '2011-04-01'}}).sort('dt').exec(function(err, docs) {
          if (!--pending) {
            db.close();
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

        D.find({'dt': {$gt: '2011-03-30', $lt: '2011-04-02'}}).sort('dt').exec(function(err, docs) {
          if (!--pending) {
            db.close();
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

        var db = start(),
            blogPost = db.model('BlogPostB', collection);

        blogPost.collection.ensureIndex({title: 'text'}, function(error) {
          assert.ifError(error);
          var a = new blogPost({title: 'querying in mongoose'});
          var b = new blogPost({title: 'text search in mongoose'});
          a.save(function(error) {
            assert.ifError(error);
            b.save(function(error) {
              assert.ifError(error);
              blogPost.
              find({$text: {$search: 'text search'}}, {score: {$meta: 'textScore'}}).
              limit(2).
              exec(function(error, documents) {
                assert.ifError(error);
                assert.equal(documents.length, 1);
                assert.equal(documents[0].title, 'text search in mongoose');
                a.remove(function(error) {
                  assert.ifError(error);
                  b.remove(function(error) {
                    assert.ifError(error);
                    db.close(done);
                  });
                });
              });
            });
          });
        });
      });

      it('works when text search is called by a schema (gh-3824)', function(done) {
        if (!mongo26_or_greater) {
          return done();
        }

        var db = start();

        var exampleSchema = new Schema({
          title: String,
          name: { type: String, text: true },
          large_text: String
        });

        var Example = db.model('gh3824', exampleSchema);

        Example.on('index', function(error) {
          assert.ifError(error);
          Example.findOne({ $text: { $search: 'text search' } }, function(error) {
            assert.ifError(error);
            db.close(done);
          });
        });
      });
    });
  });

  describe('limit', function() {
    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'first limit'}, function(err, first) {
        assert.ifError(err);
        BlogPostB.create({title: 'second limit'}, function(err, second) {
          assert.ifError(err);
          BlogPostB.create({title: 'third limit'}, function(err) {
            assert.ifError(err);
            BlogPostB.find({title: /limit$/}).limit(2).find(function(err, found) {
              db.close();
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
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: '1 skip'}, function(err) {
        assert.ifError(err);
        BlogPostB.create({title: '2 skip'}, function(err, second) {
          assert.ifError(err);
          BlogPostB.create({title: '3 skip'}, function(err, third) {
            assert.ifError(err);
            BlogPostB.find({title: /skip$/}).sort({title: 1}).skip(1).limit(2).find(function(err, found) {
              assert.ifError(err);
              assert.equal(found.length, 2);
              assert.equal(found[0].id, second._id);
              assert.equal(found[1].id, third._id);
              db.close();
              done();
            });
          });
        });
      });
    });
  });

  describe('sort', function() {
    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({meta: {visitors: 100}}, function(err, least) {
        assert.ifError(err);
        BlogPostB.create({meta: {visitors: 300}}, function(err, largest) {
          assert.ifError(err);
          BlogPostB.create({meta: {visitors: 200}}, function(err, middle) {
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
              db.close();
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

      var db = start(),
          blogPost = db.model('BlogPostB', collection);

      blogPost.collection.ensureIndex({title: 'text'}, function(error) {
        assert.ifError(error);
        var a = new blogPost({title: 'searching in mongoose'});
        var b = new blogPost({title: 'text search in mongoose'});
        a.save(function(error) {
          assert.ifError(error);
          b.save(function(error) {
            assert.ifError(error);
            blogPost.
            find({$text: {$search: 'text search'}}, {score: {$meta: 'textScore'}}).
            sort({score: {$meta: 'textScore'}}).
            limit(2).
            exec(function(error, documents) {
              assert.ifError(error);
              assert.equal(documents.length, 2);
              assert.equal(documents[0].title, 'text search in mongoose');
              assert.equal(documents[1].title, 'searching in mongoose');
              db.close();
              done();
            });
          });
        });
      });
    });
  });

  describe('nested mixed "x.y.z"', function() {
    it('works', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.find({'mixed.nested.stuff': 'skynet'}, function(err) {
        db.close();
        assert.ifError(err);
        done();
      });
    });
  });

  it('by Date (gh-336)', function(done) {
    // GH-336
    var db = start(),
        Test = db.model('TestDateQuery', new Schema({date: Date}), 'datetest_' + random()),
        now = new Date;

    Test.create({date: now}, {date: new Date(now - 10000)}, function(err) {
      assert.ifError(err);
      Test.find({date: now}, function(err, docs) {
        db.close();
        assert.ifError(err);
        assert.equal(docs.length, 1);
        done();
      });
    });
  });

  it('mixed types with $elemMatch (gh-591)', function(done) {
    var db = start(),
        S = new Schema({a: [{}], b: Number}),
        M = db.model('QueryingMixedArrays', S, random());

    var m = new M;
    m.a = [1, 2, {name: 'Frodo'}, 'IDK', {name: 100}];
    m.b = 10;

    m.save(function(err) {
      assert.ifError(err);

      M.find({a: {name: 'Frodo'}, b: '10'}, function(err, docs) {
        assert.ifError(err);
        assert.equal(docs[0].a.length, 5);
        assert.equal(docs[0].b.valueOf(), 10);

        var query = {
          a: {
            $elemMatch: {name: 100}
          }
        };

        M.find(query, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs[0].a.length, 5);
          done();
        });
      });
    });
  });

  describe('$all', function() {
    it('with ObjectIds (gh-690)', function(done) {
      var db = start();

      var SSchema = new Schema({name: String});
      var PSchema = new Schema({sub: [SSchema]});

      var P = db.model('usingAllWithObjectIds', PSchema);
      var sub = [{name: 'one'}, {name: 'two'}, {name: 'three'}];

      P.create({sub: sub}, function(err, p) {
        assert.ifError(err);

        var o0 = p.sub[0]._id;
        var o1 = p.sub[1]._id;
        var o2 = p.sub[2]._id;

        P.findOne({'sub._id': {$all: [o1, o2.toString()]}}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.id, p.id);

          P.findOne({'sub._id': {$all: [o0, new DocumentObjectId]}}, function(err, doc) {
            assert.ifError(err);
            assert.equal(!!doc, false);

            P.findOne({'sub._id': {$all: [o2]}}, function(err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              done();
            });
          });
        });
      });
    });

    it('with Dates', function(done) {
      this.timeout(3000);
      var db = start();

      var SSchema = new Schema({d: Date});
      var PSchema = new Schema({sub: [SSchema]});

      var P = db.model('usingAllWithDates', PSchema);
      var sub = [
        {d: new Date},
        {d: new Date(Date.now() - 10000)},
        {d: new Date(Date.now() - 30000)}
      ];

      P.create({sub: sub}, function(err, p) {
        assert.ifError(err);

        var o0 = p.sub[0].d;
        var o1 = p.sub[1].d;
        var o2 = p.sub[2].d;

        P.findOne({'sub.d': {$all: [o1, o2]}}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.id, p.id);

          P.findOne({'sub.d': {$all: [o0, new Date]}}, function(err, doc) {
            assert.ifError(err);
            assert.equal(!!doc, false);

            P.findOne({'sub.d': {$all: [o2]}}, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              db.close(done);
            });
          });
        });
      });
    });

    it('with $elemMatch (gh-3163)', function(done) {
      var db = start();

      start.mongodVersion(function(err, version) {
        if (err) {
          throw err;
        }
        var mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
        if (!mongo26_or_greater) {
          return done();
        }

        next();
      });

      var next = function() {
        var schema = new Schema({test: [String]});
        var MyModel = db.model('gh3163', schema);

        MyModel.create({test: ['log1', 'log2']}, function(error) {
          assert.ifError(error);
          var query = {test: {$all: [{$elemMatch: {$regex: /log/g}}]}};
          MyModel.find(query, function(error, docs) {
            assert.ifError(error);
            assert.equal(docs.length, 1);
            db.close(done);
          });
        });
      };
    });
  });

  describe('and', function() {
    it('works with queries gh-1188', function(done) {
      var db = start();
      var B = db.model('BlogPostB');

      B.create({title: 'and operator', published: false, author: 'Me'}, function(err) {
        assert.ifError(err);

        B.find({$and: [{title: 'and operator'}]}, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);

          B.find({$and: [{title: 'and operator'}, {published: true}]}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 0);

            B.find({$and: [{title: 'and operator'}, {published: false}]}, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);

              var query = B.find();
              query.and([
                {title: 'and operator', published: false},
                {author: 'Me'}
              ]);
              query.exec(function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);

                var query = B.find();
                query.and([
                  {title: 'and operator', published: false},
                  {author: 'You'}
                ]);
                query.exec(function(err, docs) {
                  assert.ifError(err);
                  assert.equal(docs.length, 0);
                  db.close(done);
                });
              });
            });
          });
        });
      });
    });

    it('works with nested query selectors gh-1884', function(done) {
      var db = start();
      var B = db.model('gh1884', {a: String, b: String}, 'gh1884');

      B.remove({$and: [{a: 'coffee'}, {b: {$in: ['bacon', 'eggs']}}]}, function(error) {
        assert.ifError(error);
        db.close(done);
      });
    });
  });

  it('works with different methods and query types', function(done) {
    var db = start(),
        BufSchema = new Schema({name: String, block: Buffer}),
        Test = db.model('BufferTest', BufSchema, 'buffers');

    var docA = {name: 'A', block: new Buffer('über')};
    var docB = {name: 'B', block: new Buffer('buffer shtuffs are neat')};
    var docC = {name: 'C', block: 'hello world'};

    Test.create(docA, docB, docC, function(err, a, b, c) {
      assert.ifError(err);
      assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
      assert.equal(a.block.toString('utf8'), 'über');
      assert.equal(c.block.toString('utf8'), 'hello world');

      Test.findById(a._id, function(err, a) {
        assert.ifError(err);
        assert.equal(a.block.toString('utf8'), 'über');

        Test.findOne({block: 'buffer shtuffs are neat'}, function(err, rb) {
          assert.ifError(err);
          assert.equal(rb.block.toString('utf8'), 'buffer shtuffs are neat');

          Test.findOne({block: /buffer/i}, function(err) {
            assert.equal(err.message, 'Cast to buffer failed for value ' +
              '"/buffer/i" at path "block" for model "BufferTest"');
            Test.findOne({block: [195, 188, 98, 101, 114]}, function(err, rb) {
              assert.ifError(err);
              assert.equal(rb.block.toString('utf8'), 'über');

              Test.findOne({block: 'aGVsbG8gd29ybGQ='}, function(err, rb) {
                assert.ifError(err);
                assert.strictEqual(rb, null);

                Test.findOne({block: new Buffer('aGVsbG8gd29ybGQ=', 'base64')}, function(err, rb) {
                  assert.ifError(err);
                  assert.equal(rb.block.toString('utf8'), 'hello world');

                  Test.findOne({block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64')}, function(err, rb) {
                    assert.ifError(err);
                    assert.equal(rb.block.toString('utf8'), 'hello world');

                    Test.remove({}, function(err) {
                      db.close();
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

  it('with conditionals', function(done) {
    // $in $nin etc
    var db = start(),
        BufSchema = new Schema({name: String, block: Buffer}),
        Test = db.model('Buffer2', BufSchema, 'buffer_' + random());

    var docA = {name: 'A', block: new MongooseBuffer([195, 188, 98, 101, 114])}; // über
    var docB = {name: 'B', block: new MongooseBuffer('buffer shtuffs are neat')};
    var docC = {name: 'C', block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64')};

    Test.create(docA, docB, docC, function(err, a, b, c) {
      assert.ifError(err);
      assert.equal(a.block.toString('utf8'), 'über');
      assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
      assert.equal(c.block.toString('utf8'), 'hello world');

      Test.find({block: {$in: [[195, 188, 98, 101, 114], 'buffer shtuffs are neat', new Buffer('aGVsbG8gd29ybGQ=', 'base64')]}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 3);
      });

      Test.find({block: {$in: ['über', 'hello world']}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 2);
      });

      Test.find({block: {$in: ['über']}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'über');
      });

      Test.find({block: {$nin: ['über']}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 2);
      });

      Test.find({block: {$nin: [[195, 188, 98, 101, 114], new Buffer('aGVsbG8gd29ybGQ=', 'base64')]}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'buffer shtuffs are neat');
      });

      Test.find({block: {$ne: 'über'}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 2);
      });

      Test.find({block: {$gt: 'über'}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 2);
      });

      Test.find({block: {$gte: 'über'}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 3);
      });

      Test.find({block: {$lt: new Buffer('buffer shtuffs are neat')}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 2);
        var ret = {};
        ret[tests[0].block.toString('utf8')] = 1;
        ret[tests[1].block.toString('utf8')] = 1;

        assert.ok(ret['über'] !== undefined);
      });

      Test.find({block: {$lte: 'buffer shtuffs are neat'}}, function(err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(tests.length, 3);
      });

      var pending = 9;

      function cb() {
        if (--pending) {
          return;
        }
        Test.remove({}, function(err) {
          db.close();
          assert.ifError(err);
          done();
        });
      }
    });
  });

  it('with previously existing null values in the db', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection),
        post = new BlogPostB();

    post.collection.insert({meta: {visitors: 9898, a: null}}, {}, function(err, b) {
      assert.ifError(err);

      BlogPostB.findOne({_id: b.ops[0]._id}, function(err, found) {
        assert.ifError(err);
        assert.equal(found.get('meta.visitors').valueOf(), 9898);
        db.close();
        done();
      });
    });
  });

  it('with unused values in the db', function(done) {
    var db = start(),
        BlogPostB = db.model('BlogPostB', collection),
        post = new BlogPostB();

    post.collection.insert({meta: {visitors: 9898, color: 'blue'}}, {}, function(err, b) {
      assert.ifError(err);

      BlogPostB.findOne({_id: b.ops[0]._id}, function(err, found) {
        assert.ifError(err);
        assert.equal(found.get('meta.visitors').valueOf(), 9898);
        found.save(function(err) {
          assert.ifError(err);
          db.close();
          done();
        });
      });
    });
  });

  describe('2d', function() {
    it('$near (gh-309)', function(done) {
      var db = start(),
          Test = db.model('Geo1', geoSchema, 'geospatial' + random());

      var pending = 2;

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
      Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

      function test() {
        Test.find({loc: {$near: [30, 40]}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 2);
          done();
        });
      }
    });

    it('$within arrays (gh-586)', function(done) {
      var db = start(),
          Test = db.model('Geo2', geoSchema, collection + 'geospatial');

      var pending = 2;

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
      Test.create({loc: [35, 50]}, {loc: [-40, -90]}, complete);

      function test() {
        Test.find({loc: {'$within': {'$box': [[30, 40], [40, 60]]}}}, function(err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 1);
          done();
        });
      }
    });

    it('$nearSphere with arrays (gh-610)', function(done) {
      var db = start(),
          Test = db.model('Geo3', geoSchema, 'y' + random());

      var pending = 2;

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
      Test.create({loc: [10, 20]}, {loc: [40, 90]}, complete);

      function test() {
        Test.find({loc: {$nearSphere: [30, 40]}}, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);
          db.close(done);
        });
      }
    });

    it('$nearSphere with invalid coordinate does not crash (gh-1874)', function(done) {
      var geoSchema = new Schema({
        loc: {
          type: {type: String},
          coordinates: {type: [Number], index: '2dsphere'}
        }
      });
      var db = start(),
          Test = db.model('gh1874', geoSchema, 'gh1874');

      var pending = 2;
      var complete = function(err) {
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
          {loc: {coordinates: [30, 41]}},
          {loc: {coordinates: [31, 40]}},
          complete);

      var test = function() {
        var q = new Query({}, {}, null, Test.collection);
        q.find({
          loc: {
            $nearSphere: {
              $geometry: {type: 'Point', coordinates: [30, 40]},
              $maxDistance: 10000000
            }
          }
        });

        assert.doesNotThrow(function() {
          q.cast(Test);
        });

        db.close(done);
      };
    });

    it('$maxDistance with arrays', function(done) {
      var db = start(),
          Test = db.model('Geo4', geoSchema, 'x' + random());

      var pending = 2;

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
      Test.create({loc: [20, 80]}, {loc: [25, 30]}, complete);

      function test() {
        Test.find({loc: {$near: [25, 31], $maxDistance: 1}}, function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          Test.find({loc: {$near: [25, 32], $maxDistance: 1}}, function(err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 0);
            done();
          });
        });
      }
    });
  });

  describe('2dsphere', function() {
    var schema2dsphere;
    var geoSchema;
    var geoMultiSchema;

    before(function() {
      schema2dsphere = new Schema({loc: {type: [Number], index: '2dsphere'}});

      geoSchema = new Schema({line: {type: {type: String}, coordinates: []}});
      geoSchema.index({line: '2dsphere'});

      geoMultiSchema = new Schema({geom: [{type: {type: String}, coordinates: []}]});
      // see mongodb issue SERVER-8907
      // geoMultiSchema.index({ geom: '2dsphere' });
    });

    // mongodb 2.4
    var mongo24_or_greater = false;
    before(function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          throw err;
        }

        mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
        if (!mongo24_or_greater) {
          console.log('not testing mongodb 2.4 features');
        }
        done();
      });
    });

    it('index is allowed in schema', function(done) {
      if (!mongo24_or_greater) {
        return done();
      }

      var ok = schema2dsphere.indexes().some(function(index) {
        return index[0].loc === '2dsphere';
      });
      assert.ok(ok);
      done();
    });

    describe('$geometry', function() {
      it('Polygon', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        var db = start(),
            Test = db.model('2dsphere-polygon', schema2dsphere, 'geospatial' + random());

        Test.on('index', function(err) {
          assert.ifError(err);

          Test.create({loc: [0, 0]}, function(err, created) {
            assert.ifError(err);

            var geojsonPoly = {type: 'Polygon', coordinates: [[[-5, -5], ['-5', 5], [5, 5], [5, -5], [-5, '-5']]]};

            Test.find({loc: {$within: {$geometry: geojsonPoly}}}, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);
              assert.equal(created.id, docs[0].id);

              Test.where('loc').within().geometry(geojsonPoly).exec(function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);
                assert.equal(created.id, docs[0].id);
                db.close(done);
              });
            });
          });
        });
      });
    });

    describe('$geoIntersects', function() {
      it('LineString', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        var db = start(),
            Test = db.model('2dsphere-geo', geoSchema, 'geospatial' + random());

        Test.on('index', function(err) {
          assert.ifError(err);

          Test.create({line: {type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]]}}, function(err, created) {
            assert.ifError(err);

            var geojsonLine = {type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']]};

            Test.find({line: {$geoIntersects: {$geometry: geojsonLine}}}, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);
              assert.equal(created.id, docs[0].id);

              Test.where('line').intersects().geometry(geojsonLine).findOne(function(err, doc) {
                assert.ifError(err);
                assert.equal(created.id, doc.id);
                db.close(done);
              });
            });
          });
        });
      });

      it('MultiLineString', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        var db = start(),
            Test = db.model('2dsphere-geo-multi1', geoMultiSchema, 'geospatial' + random());

        Test.create({
          geom: [{type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]]},
            {type: 'LineString', coordinates: [[-178.0, 5.0], [178.0, 5.0]]}]
        }, function(err, created) {
          assert.ifError(err);

          var geojsonLine = {type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']]};

          Test.find({geom: {$geoIntersects: {$geometry: geojsonLine}}}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(created.id, docs[0].id);

            Test.where('geom').intersects().geometry(geojsonLine).findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(created.id, doc.id);
              db.close(done);
            });
          });
        });
      });

      it('MultiPolygon', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        var db = start(),
            Test = db.model('2dsphere-geo-multi2', geoMultiSchema, 'geospatial' + random());

        Test.create({
          geom: [{type: 'Polygon', coordinates: [[[28.7, 41], [29.2, 40.9], [29.1, 41.3], [28.7, 41]]]},
            {type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]}]
        }, function(err, created) {
          assert.ifError(err);

          var geojsonPolygon = {type: 'Polygon', coordinates: [[[26, 36], [45, 36], [45, 42], [26, 42], [26, 36]]]};

          Test.find({geom: {$geoIntersects: {$geometry: geojsonPolygon}}}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(created.id, docs[0].id);

            Test.where('geom').intersects().geometry(geojsonPolygon).findOne(function(err, doc) {
              assert.ifError(err);
              assert.equal(created.id, doc.id);
              db.close(done);
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

        var db = start(),
            Test = db.model('2dsphere-geo', geoSchema, 'geospatial' + random());

        Test.on('index', function(err) {
          assert.ifError(err);

          Test.create({line: {type: 'Point', coordinates: [-179.0, 0.0]}}, function(err, created) {
            assert.ifError(err);

            var geojsonPoint = {type: 'Point', coordinates: [-179.0, 0.0]};

            Test.find({line: {$near: geojsonPoint}}, function(err, docs) {
              assert.ifError(err);
              assert.equal(docs.length, 1);
              assert.equal(created.id, docs[0].id);

              Test.find({line: {$near: {$geometry: geojsonPoint, $maxDistance: 50}}}, function(err, docs) {
                assert.ifError(err);
                assert.equal(docs.length, 1);
                assert.equal(created.id, docs[0].id);
                db.close(done);
              });
            });
          });
        });
      });

      it('works with GeoJSON (gh-1482)', function(done) {
        if (!mongo24_or_greater) {
          return done();
        }

        var geoJSONSchema = new Schema({loc: {type: {type: String}, coordinates: [Number]}});
        geoJSONSchema.index({loc: '2dsphere'});
        var name = 'geospatial' + random();
        var db = start(),
            Test = db.model('Geo1', geoJSONSchema, name);

        var pending = 2;

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
        Test.create({loc: {type: 'Point', coordinates: [10, 20]}}, {
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
            db.close();
            assert.ifError(err);
            assert.equal(docs.length, 1);
            done();
          });
        }
      });
    });
  });

  describe('hashed indexes', function() {
    var mongo24_or_greater = false;

    before(function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          return done(err);
        }
        mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
        if (!mongo24_or_greater) {
          console.log('not testing mongodb 2.4 features');
        }
        done();
      });
    });

    it('work', function(done) {
      if (!mongo24_or_greater) {
        return done();
      }
      var db = start();
      var schemas = [];
      schemas[0] = new Schema({t: {type: String, index: 'hashed'}});
      schemas[1] = new Schema({t: {type: String, index: 'hashed', sparse: true}});
      schemas[2] = new Schema({t: {type: String, index: {type: 'hashed', sparse: true}}});

      var pending = schemas.length;

      schemas.forEach(function(schema, i) {
        var H = db.model('Hashed' + i, schema);
        H.on('index', function(err) {
          assert.ifError(err);
          H.collection.getIndexes({full: true}, function(err, indexes) {
            assert.ifError(err);

            var found = indexes.some(function(index) {
              return index.key.t === 'hashed';
            });
            assert.ok(found);

            H.create({t: 'hashing'}, {}, function(err, doc1, doc2) {
              assert.ifError(err);
              assert.ok(doc1);
              assert.ok(doc2);
              complete();
            });
          });
        });
      });

      function complete() {
        if (--pending === 0) {
          db.close(done);
        }
      }
    });
  });

  describe('lean', function() {
    it('find', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);
        BlogPostB.find({title: title}).lean().exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0] instanceof mongoose.Document, false);
          BlogPostB.find({title: title}, null, {lean: true}, function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.strictEqual(docs[0] instanceof mongoose.Document, false);
            db.close();
            done();
          });
        });
      });
    });

    it('findOne', function(done) {
      var db = start(),
          BlogPostB = db.model('BlogPostB', collection),
          title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function(err) {
        assert.ifError(err);
        BlogPostB.findOne({title: title}, null, {lean: true}, function(err, doc) {
          db.close();
          assert.ifError(err);
          assert.ok(doc);
          assert.strictEqual(false, doc instanceof mongoose.Document);
          done();
        });
      });
    });
    it('properly casts nested and/or queries (gh-676)', function(done) {
      var sch = new Schema({
        num: Number,
        subdoc: {title: String, num: Number}
      });

      var M = mongoose.model('andor' + random(), sch);

      var cond = {
        $and: [
          {$or: [{num: '23'}, {'subdoc.num': '45'}]},
          {$and: [{'subdoc.title': 233}, {num: '345'}]}
        ]
      };
      var q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[1]['subdoc.num'], 'number');
      assert.equal(typeof q._conditions.$and[1].$and[0]['subdoc.title'], 'string');
      assert.equal(typeof q._conditions.$and[1].$and[1].num, 'number');
      done();
    });
    it('properly casts deeply nested and/or queries (gh-676)', function(done) {
      var sch = new Schema({
        num: Number,
        subdoc: {title: String, num: Number}
      });

      var M = mongoose.model('andor' + random(), sch);

      var cond = {
        $and: [{$or: [{$and: [{$or: [{num: '12345'}, {'subdoc.num': '56789'}]}]}]}]
      };
      var q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[1]['subdoc.num'], 'number');
      done();
    });

    it('casts $elemMatch (gh-2199)', function(done) {
      var db = start();
      var schema = new Schema({dates: [Date]});
      var Dates = db.model('Date', schema, 'dates');

      var array = ['2014-07-01T02:00:00.000Z', '2014-07-01T04:00:00.000Z'];
      Dates.create({dates: array}, function(err) {
        assert.ifError(err);
        var elemMatch = {$gte: '2014-07-01T03:00:00.000Z'};
        Dates.findOne({}, {dates: {$elemMatch: elemMatch}}, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.dates.length, 1);
          assert.equal(doc.dates[0].getTime(),
              new Date('2014-07-01T04:00:00.000Z').getTime());
          db.close(done);
        });
      });
    });

    describe('$eq', function() {
      var mongo26 = false;

      before(function(done) {
        start.mongodVersion(function(err, version) {
          if (err) {
            return done(err);
          }
          mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
          done();
        });
      });

      it('casts $eq (gh-2752)', function(done) {
        var db = start();
        var BlogPostB = db.model('BlogPostB', collection);

        BlogPostB.findOne(
            {_id: {$eq: '000000000000000000000001'}, numbers: {$eq: [1, 2]}},
            function(err, doc) {
              if (mongo26) {
                assert.ifError(err);
              } else {
                assert.ok(err.toString().indexOf('MongoError') !== -1);
              }

              assert.ok(!doc);
              db.close(done);
            });
      });
    });
  });
});
