
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
  , ObjectId = Schema.ObjectId
  , MongooseBuffer = mongoose.Types.Buffer
  , DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPostB = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , tags      : [String]
  , sigs      : [Buffer]
  , owners    : [ObjectId]
  , comments  : [Comments]
  , def       : { type: String, default: 'kandinsky' }
});

mongoose.model('BlogPostB', BlogPostB);
var collection = 'blogposts_' + random();

var ModSchema = new Schema({
    num: Number
  , str: String
});
mongoose.model('Mod', ModSchema);

var geoSchema = new Schema({ loc: { type: [Number], index: '2d'}});

describe('model: querying:', function(){
  it('find returns a Query', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

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

    db.close();
    done();
  });

  it('findOne returns a Query', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

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

    db.close();
    done();
  });

  it('an empty find does not hang', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)

    function fn () {
      db.close();
      done();
    };

    BlogPostB.find({}, fn);
  });

  it('a query is executed when a callback is passed', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      if (--count) return;
      db.close();
      done();
    };

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

  it('query is executed where a callback for findOne', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      if (--count) return;
      db.close();
      done();
    };

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

  describe('count', function(){
    it('returns a Query', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);
      assert.ok(BlogPostB.count({}) instanceof Query);
      db.close();
      done();
    });

    it('Query executes when you pass a callback', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , pending = 2

      function fn () {
        if (--pending) return;
        db.close();
        done();
      };

      assert.ok(BlogPostB.count({}, fn) instanceof Query);
      assert.ok(BlogPostB.count(fn) instanceof Query);
    });

    it('counts documents', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        assert.ifError(err);

        var post = new BlogPostB();
        post.set('title', title);

        post.save(function (err) {
          assert.ifError(err);

          BlogPostB.count({ title: title }, function (err, count) {
            assert.ifError(err);

            assert.equal('number', typeof count);
            assert.equal(2, count);

            db.close();
            done();
          });
        });
      });
    })
  });

  describe('distinct', function(){
    it('returns a Query', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      assert.ok(BlogPostB.distinct('title', {}) instanceof Query);
      db.close();
      done();
    });

    it('executes when you pass a callback', function(done){
      var db = start();
      var Address = new Schema({ zip: String });
      Address = db.model('Address', Address, 'addresses_' + random());

      Address.create({ zip: '10010'}, { zip: '10010'}, { zip: '99701'}, function (err, a1, a2, a3) {
        assert.strictEqual(null, err);
        var query = Address.distinct('zip', {}, function (err, results) {
          assert.ifError(err);
          assert.deepEqual(results, ['10010', '99701']);
          db.close();
          done();
        });
        assert.ok(query instanceof Query);
      });
    });
  });

  describe('update', function(){
    it('returns a Query', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      assert.ok(BlogPostB.update({}, {}) instanceof Query);
      assert.ok(BlogPostB.update({}, {}, {}) instanceof Query);
      db.close();
      done();
    });

    it('Query executes when you pass a callback', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , count = 2;

      function fn () {
        if (--count) return;
        db.close();
        done();
      };

      assert.ok(BlogPostB.update({title: random()}, {}, fn) instanceof Query);
      assert.ok(BlogPostB.update({title: random()}, {}, {}, fn) instanceof Query);
    })
  });

  describe('findOne', function () {
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findOne({ title: title }, function (err, doc) {
          assert.ifError(err);
          assert.equal(title, doc.get('title'));
          assert.equal(false, doc.isNew);

          db.close();
          done();
        });
      });
    });

    it('casts $modifiers', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , post = new BlogPostB({
            meta: {
              visitors: -10
            }
          });

      post.save(function (err) {
        assert.ifError(err);

        var query = { 'meta.visitors': { $gt: '-20', $lt: -1 }};
        BlogPostB.findOne(query, function (err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(found.get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
          found.id; // trigger caching
          assert.equal(found.get('_id').toString(), post.get('_id'));
          db.close();
          done();
        });
      });
    })

    it('querying if an array contains one of multiple members $in a set', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB();

      post.tags.push('football');

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findOne({tags: {$in: ['football', 'baseball']}}, function (err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(),post._id);

          BlogPostB.findOne({ _id: post._id, tags: /otba/i }, function (err, doc) {
            assert.ifError(err);
            assert.equal(doc._id.toString(),post._id);
            db.close();
            done();
          });
        });
      });
    });

    it('querying if an array contains one of multiple members $in a set 2', function(done){
      var db = start()
        , BlogPostA = db.model('BlogPostB', collection)

      var post = new BlogPostA({ tags: ['gooberOne'] });

      post.save(function (err) {
        assert.ifError(err);

        var query = {tags: {$in:[ 'gooberOne' ]}};

        BlogPostA.findOne(query, function (err, returned) {
          cb();
          assert.ifError(err);
          assert.ok(!!~returned.tags.indexOf('gooberOne'));
          assert.equal(returned._id.toString(), post._id);
        });
      });

      post.collection.insert({ meta: { visitors: 9898, a: null } }, {}, function (err, b) {
        assert.ifError(err);

        BlogPostA.findOne({_id: b[0]._id}, function (err, found) {
          cb();
          assert.ifError(err);
          assert.equal(found.get('meta.visitors'), 9898);
        });
      });

      var pending = 2;
      function cb () {
        if (--pending) return;
        db.close();
        done();
      }
    })

    it('querying via $where a string', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({ title: 'Steve Jobs', author: 'Steve Jobs'}, function (err, created) {
        assert.ifError(err);

        BlogPostB.findOne({ $where: "this.title && this.title === this.author" }, function (err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(),created._id);
          db.close();
          done();
        });
      });
    });

    it('querying via $where a function', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({ author: 'Atari', slug: 'Atari'}, function (err, created) {
        assert.ifError(err);

        BlogPostB.findOne({ $where: function () {
          return (this.author && this.slug && this.author === this.slug);
        } }, function (err, found) {
          assert.ifError(err);

          assert.equal(found._id.toString(), created._id);
          db.close();
          done();
        });
      });
    })

    it('based on nested fields', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , post = new BlogPostB({
            meta: {
              visitors: 5678
            }
          });

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findOne({ 'meta.visitors': 5678 }, function (err, found) {
          assert.ifError(err);
          assert.equal(found.get('meta.visitors')
            .valueOf(), post.get('meta.visitors').valueOf());
          assert.equal(found.get('_id').toString(), post.get('_id'));
          db.close();
          done();
        });
      });
    })

    it('based on embedded doc fields (gh-242, gh-463)', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({comments: [{title: 'i should be queryable'}], numbers: [1,2,33333], tags:['yes', 'no']}, function (err, created) {
        assert.ifError(err);
        BlogPostB.findOne({'comments.title': 'i should be queryable'}, function (err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          BlogPostB.findOne({'comments.0.title': 'i should be queryable'}, function (err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);

            // GH-463
            BlogPostB.findOne({'numbers.2': 33333}, function (err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.findOne({'tags.1': 'no'}, function (err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);
                db.close();
                done();
              });
            });
          });
        });
      });
    })

    it('works with nested docs and string ids (gh-389)', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({comments: [{title: 'i should be queryable by _id'}, {title:'me too me too!'}]}, function (err, created) {
        assert.ifError(err);
        var id = created.comments[1]._id.toString();
        BlogPostB.findOne({'comments._id': id}, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.strictEqual(!! found, true, 'Find by nested doc id hex string fails');
          assert.equal(found._id.toString(), created._id);
          done();
        });
      });
    })

    it('using #all with nested #elemMatch', function(done){
      var db = start()
        , P = db.model('BlogPostB', collection + '_nestedElemMatch');

      var post = new P({ title: "nested elemMatch" });
      post.comments.push({ title: 'comment A' }, { title: 'comment B' }, { title: 'comment C' })

      var id0 = post.comments[0]._id;
      var id1 = post.comments[1]._id;
      var id2 = post.comments[2]._id;

      post.save(function (err) {
        assert.ifError(err);

        var query0 = { $elemMatch: { _id: id1, title: 'comment B' }};
        var query1 = { $elemMatch: { _id: id2.toString(), title: 'comment C' }};

        P.findOne({ comments: { $all: [query0, query1] }}, function (err, p) {
          db.close();
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('using #or with nested #elemMatch', function(done){
      var db = start()
        , P = db.model('BlogPostB', collection);

      var post = new P({ title: "nested elemMatch" });
      post.comments.push({ title: 'comment D' }, { title: 'comment E' }, { title: 'comment F' })

      var id0 = post.comments[0]._id;
      var id1 = post.comments[1]._id;
      var id2 = post.comments[2]._id;

      post.save(function (err) {
        assert.ifError(err);

        var query0 = { comments: { $elemMatch: { title: 'comment Z' }}};
        var query1 = { comments: { $elemMatch: { _id: id1.toString(), title: 'comment E' }}};

        P.findOne({ $or: [query0, query1] }, function (err, p) {
          db.close();
          assert.ifError(err);
          assert.equal(p.id, post.id);
          done();
        });
      });
    });

    it('buffer $in array', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({sigs: [new Buffer([1, 2, 3]),
                               new Buffer([4, 5, 6]),
                               new Buffer([7, 8, 9])]}, function (err, created) {
        assert.ifError(err);
        BlogPostB.findOne({sigs: new Buffer([1, 2, 3])}, function (err, found) {
          assert.ifError(err);
          found.id;
          assert.equal(found._id.toString(), created._id);
          var query = { sigs: { "$in" : [new Buffer([3, 3, 3]), new Buffer([4, 5, 6])] } };
          BlogPostB.findOne(query, function (err, found) {
            assert.ifError(err);
            db.close();
            done();
          });
        });
      });
    });

    it('regex with Array (gh-599)', function(done){
      var db = start()
        , B = db.model('BlogPostB', random())

      B.create({ tags: 'wooof baaaark meeeeow'.split(' ') }, function (err, b) {
        assert.ifError(err);
        B.findOne({ tags: /ooof$/ }, function (err, doc) {
          assert.ifError(err);
          assert.strictEqual(true, !! doc);
          assert.ok(!! ~doc.tags.indexOf('meeeeow'));

          B.findOne({ tags: {$regex: 'eow$' } }, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.strictEqual(true, !! doc);
            assert.strictEqual(true, !! ~doc.tags.indexOf('meeeeow'));
            done();
          });
        });
      });
    });

    it('regex with options', function(done){
      var db = start()
        , B = db.model('BlogPostB', collection)

      var post = new B({ title: '$option queries' });
      post.save(function (err) {
        assert.ifError(err);
        B.findOne({ title: { $regex: ' QUERIES$', $options: 'i' }}, function (err, doc) {
          db.close();
          assert.strictEqual(null, err, err && err.stack);
          assert.equal(doc.id, post.id);
          done();
        })
      });
    });

    it('works with $elemMatch and $in combo (gh-1100)', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , id1 = new DocumentObjectId
        , id2 = new DocumentObjectId

      BlogPostB.create({owners: [id1, id2]}, function (err, created) {
        assert.ifError(err);
        BlogPostB.findOne({owners: {'$elemMatch': { $in: [id2.toString()] }}}, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.ok(found);
          assert.equal(created.id, found.id);
          done();
        });
      });
    })
  });

  describe('findById', function () {
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , title = 'Edwald ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        assert.ifError(err);

        var pending = 2;

        BlogPostB.findById(post.get('_id'), function (err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(title, doc.get('title'));
          if (--pending) return;
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id').toHexString(), function (err, doc) {
          assert.ifError(err);
          assert.ok(doc instanceof BlogPostB);
          assert.equal(title, doc.get('title'));
          if (--pending) return;
          db.close();
          done();
        });
      });
    });

    it('works with partial initialization', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , queries = 5;

      var post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';
      post.meta.visitors = 53;
      post.tags = ['humidity', 'soggy'];

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findById(post.get('_id'), function (err, doc) {
          assert.ifError(err);

          assert.equal(true, doc.isInit('title'));
          assert.equal(true, doc.isInit('slug'));
          assert.equal(false, doc.isInit('date'));
          assert.equal(true, doc.isInit('meta.visitors'));
          assert.equal(53, doc.meta.visitors.valueOf());
          assert.equal(2, doc.tags.length);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id'), 'title', function (err, doc) {
          assert.ifError(err);
          assert.equal(true, doc.isInit('title'));
          assert.equal(false, doc.isInit('slug'));
          assert.equal(false, doc.isInit('date'));
          assert.equal(false, doc.isInit('meta.visitors'));
          assert.equal(undefined, doc.meta.visitors);
          assert.equal(undefined, doc.tags);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id'), '-slug', function (err, doc) {
          assert.ifError(err);
          assert.equal(true, doc.isInit('title'));
          assert.equal(false, doc.isInit('slug'));
          assert.equal(false, doc.isInit('date'));
          assert.equal(true, doc.isInit('meta.visitors'));
          assert.equal(53, doc.meta.visitors);
          assert.equal(2, doc.tags.length);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id'), { title:1 }, function (err, doc) {
          assert.ifError(err);
          assert.equal(true, doc.isInit('title'));
          assert.equal(false, doc.isInit('slug'));
          assert.equal(false, doc.isInit('date'));
          assert.equal(false, doc.isInit('meta.visitors'));
          assert.equal(undefined, doc.meta.visitors);
          assert.equal(undefined, doc.tags);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.findById(post.get('_id'), 'slug', function (err, doc) {
          assert.ifError(err);
          assert.equal(false, doc.isInit('title'));
          assert.equal(true, doc.isInit('slug'));
          assert.equal(false, doc.isInit('date'));
          assert.equal(false, doc.isInit('meta.visitors'));
          assert.equal(undefined, doc.meta.visitors);
          assert.equal(undefined, doc.tags);
          if (--queries) return;
          db.close();
          done();
        });
      });
    });

    it('querying if an array contains at least a certain single member (gh-220)', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB();

      post.tags.push('cat');

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findOne({tags: 'cat'}, function (err, doc) {
          assert.ifError(err);
          assert.equal(doc._id.toString(),post._id);
          db.close();
          done();
        });
      });
    });


    it('where an array where the $slice operator', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({numbers: [500,600,700,800]}, function (err, created) {
        assert.ifError(err);
        BlogPostB.findById(created._id, {numbers: {$slice: 2}}, function (err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);
          assert.equal(2, found.numbers.length);
          assert.equal(500, found.numbers[0]);
          assert.equal(600, found.numbers[1]);
          BlogPostB.findById(created._id, {numbers: {$slice: -2}}, function (err, found) {
            assert.ifError(err);
            assert.equal(found._id.toString(), created._id);
            assert.equal(2, found.numbers.length);
            assert.equal(700, found.numbers[0]);
            assert.equal(800, found.numbers[1]);
            BlogPostB.findById(created._id, {numbers: {$slice: [1, 2]}}, function (err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);
              assert.equal(2, found.numbers.length);
              assert.equal(600, found.numbers[0]);
              assert.equal(700, found.numbers[1]);
              db.close();
              done();
            });
          });
        });
      });
    });

  });

  describe('find', function () {
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , title = 'Wooooot ' + random();

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        assert.ifError(err);

        var post = new BlogPostB();
        post.set('title', title);

        post.save(function (err) {
          assert.ifError(err);

          BlogPostB.find({ title: title }, function (err, docs) {
            assert.ifError(err);
            assert.equal(2, docs.length);

            assert.equal(title, docs[0].get('title'));
            assert.equal(false, docs[0].isNew);

            assert.equal(title, docs[1].get('title'));
            assert.equal(false, docs[1].isNew);

            db.close();
            done();
          });
        });
      });
    });

    it('returns docs where an array that contains one specific member', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);
      BlogPostB.create({numbers: [100, 101, 102]}, function (err, created) {
        assert.ifError(err);
        BlogPostB.find({numbers: 100}, function (err, found) {
          assert.ifError(err);
          assert.equal(1, found.length);
          assert.equal(found[0]._id.toString(), created._id);
          db.close();
          done();
        });
      });
    });

    it('works when comparing $ne with single value against an array', function(done){
      var db = start();
      var schema = new Schema({
          ids: [Schema.ObjectId]
        , b: Schema.ObjectId
      });

      var NE = db.model('NE_Test', schema, 'nes__' + random());

      var id1 = new DocumentObjectId;
      var id2 = new DocumentObjectId;
      var id3 = new DocumentObjectId;
      var id4 = new DocumentObjectId;

      NE.create({ ids: [id1, id4], b: id3 }, function (err, ne1) {
        assert.ifError(err);
        NE.create({ ids: [id2, id4], b: id3 },function (err, ne2) {
          assert.ifError(err);

          var query = NE.find({ 'b': id3.toString(), 'ids': { $ne: id1 }});
          query.exec(function (err, nes1) {
            assert.ifError(err);
            assert.equal(1, nes1.length);

            NE.find({ b: { $ne: [1] }}, function (err, nes2) {
              assert.equal("Invalid ObjectId", err.message);

              NE.find({ b: { $ne: 4 }}, function (err, nes3) {
                assert.equal("Invalid ObjectId", err.message);

                NE.find({ b: id3, ids: { $ne: id4 }}, function (err, nes4) {
                  db.close();
                  assert.ifError(err);
                  assert.equal(0, nes4.length);
                  done();
                });
              });
            });
          });

        });
      });
    });

    it('with partial initialization', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , queries = 4;

      var post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.find({ _id: post.get('_id') }, function (err, docs) {
          assert.ifError(err);
          assert.equal(true, docs[0].isInit('title'));
          assert.equal(true, docs[0].isInit('slug'));
          assert.equal(false, docs[0].isInit('date'));
          assert.strictEqual('kandinsky', docs[0].def);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, 'title', function (err, docs) {
          assert.ifError(err);
          assert.equal(true, docs[0].isInit('title'));
          assert.equal(false, docs[0].isInit('slug'));
          assert.equal(false, docs[0].isInit('date'));
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, { slug: 0, def: 0 }, function (err, docs) {
          assert.ifError(err);
          assert.equal(true, docs[0].isInit('title'));
          assert.equal(false, docs[0].isInit('slug'));
          assert.equal(false, docs[0].isInit('date'));
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) return;
          db.close();
          done();
        });

        BlogPostB.find({ _id: post.get('_id') }, 'slug', function (err, docs) {
          assert.ifError(err);
          assert.equal(false, docs[0].isInit('title'));
          assert.equal(true, docs[0].isInit('slug'));
          assert.equal(false, docs[0].isInit('date'));
          assert.strictEqual(undefined, docs[0].def);
          if (--queries) return;
          db.close();
          done();
        });
      })
    })

    it('where $exists', function(done){
      var db = start()
        , ExistsSchema = new Schema({
              a: Number
            , b: String
          });
      mongoose.model('Exists', ExistsSchema);
      var Exists = db.model('Exists', 'exists_' + random());
      Exists.create({ a: 1}, function (err, aExisting) {
        assert.ifError(err);
        Exists.create({b: 'hi'}, function (err, bExisting) {
          assert.ifError(err);
          Exists.find({b: {$exists: true}}, function (err, docs) {
            assert.ifError(err);
            db.close();
            assert.equal(1, docs.length);
            done();
          });
        });
      });
    });

    it('works with $elemMatch (gh-1100)', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection)
        , id1 = new DocumentObjectId
        , id2 = new DocumentObjectId

      BlogPostB.create({owners: [id1, id2]}, function (err, createdAfter) {
        assert.ifError(err);
        BlogPostB.find({owners: {'$elemMatch': { $in: [id2.toString()] }}}, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(1, found.length);
          done();
        });
      });
    })

    it('where $mod', function(done){
      var db = start()
        , Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function (err, one) {
        assert.ifError(err);
        Mod.create({num: 2}, function (err, two) {
          assert.ifError(err);
          Mod.find({num: {$mod: [2, 1]}}, function (err, found) {
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(), one._id);
            db.close();
            done();
          });
        });
      });
    });

    it('where $not', function(done){
      var db = start()
        , Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function (err, one) {
        assert.ifError(err);
        Mod.create({num: 2}, function (err, two) {
          assert.ifError(err);
          Mod.find({num: {$not: {$mod: [2, 1]}}}, function (err, found) {
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(),two._id);
            db.close();
            done();
          });
        });
      });
    });

    it('where or()', function(done){
      var db = start()
        , Mod = db.model('Mod', 'mods_' + random());

      Mod.create({num: 1}, {num: 2, str: 'two'}, function (err, one, two) {
        assert.ifError(err);

        var pending = 3;
        test1();
        test2();
        test3();

        function test1 () {
          Mod.find({$or: [{num: 1}, {num: 2}]}, function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(2, found.length);
            assert.equal(found[0]._id.toString(), one._id);
            assert.equal(found[1]._id.toString(), two._id);
          });
        }

        function test2 () {
          Mod.find({ $or: [{ str: 'two'}, {str:'three'}] }, function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(),two._id);
          });
        }

        function test3 () {
          Mod.find({$or: [{num: 1}]}).or([{ str: 'two' }]).exec(function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(2, found.length);
            assert.equal(found[0]._id.toString(), one._id);
            assert.equal(found[1]._id.toString(), two._id);
          });
        }

        function cb () {
          if (--pending) return;
          db.close();
          done();
        }
      });
    })

    it('where $ne', function(done){
      var db = start()
        , Mod = db.model('Mod', 'mods_' + random());
      Mod.create({num: 1}, function (err, one) {
        assert.ifError(err);
        Mod.create({num: 2}, function (err, two) {
          assert.ifError(err);
          Mod.create({num: 3}, function (err, three) {
            assert.ifError(err);
            Mod.find({num: {$ne: 1}}, function (err, found) {
              assert.ifError(err);

              assert.equal(found.length, 2);
              assert.equal(found[0]._id.toString(),two._id);
              assert.equal(found[1]._id.toString(),three._id);
              db.close();
              done();
            });
          });
        });
      });
    });

    it('where $nor', function(done){
      var db = start()
        , Mod = db.model('Mod', 'nor_' + random());

      Mod.create({num: 1}, {num: 2, str: 'two'}, function (err, one, two) {
        assert.ifError(err);

        var pending = 3;
        test1();
        test2();
        test3();

        function test1 () {
          Mod.find({$nor: [{num: 1}, {num: 3}]}, function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(),two._id);
          });
        }

        function test2 () {
          Mod.find({ $nor: [{ str: 'two'}, {str:'three'}] }, function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(), one._id);
          });
        }

        function test3 () {
          Mod.find({$nor: [{num: 2}]}).nor([{ str: 'two' }]).exec(function (err, found) {
            cb();
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(), one._id);
          });
        }

        function cb () {
          if (--pending) return;
          db.close();
          done()
        }
      });
    });

    it('STRICT null matches', function(done){
      var db = start()
      var BlogPostB = db.model('BlogPostB', collection + random());

      var a = { title: 'A', author: null};
      var b = { title: 'B' };
      BlogPostB.create(a, b, function (err, createdA, createdB) {
        assert.ifError(err);
        BlogPostB.find({author: {$in: [null], $exists: true}}, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(1, found.length);
          assert.equal(found[0]._id.toString(), createdA._id);
          done();
        });
      });
    });

    it('null matches null and undefined', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection + random());

      BlogPostB.create(
          { title: 'A', author: null }
        , { title: 'B' }, function (err, createdA, createdB) {
        assert.ifError(err);
        BlogPostB.find({author: null}, function (err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(2, found.length);
          done();
        });
      });
    });

    it('a document whose arrays contain at least $all string values', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB({ title: "Aristocats" });

      post.tags.push('onex');
      post.tags.push('twox');
      post.tags.push('threex');

      post.save(function (err) {
        assert.ifError(err);

        BlogPostB.findById(post._id, function (err, post) {
          assert.ifError(err);

          BlogPostB.find({ title: { '$all': ['Aristocats']}}, function (err, docs) {
            assert.ifError(err);
            assert.equal(1, docs.length);

            BlogPostB.find({ title: { '$all': [/^Aristocats/]}}, function (err, docs) {
              assert.ifError(err);
              assert.equal(1, docs.length);

              BlogPostB.find({tags: { '$all': ['onex','twox','threex']}}, function (err, docs) {
                assert.ifError(err);
                assert.equal(1, docs.length);

                BlogPostB.find({tags: { '$all': [/^onex/i]}}, function (err, docs) {
                  assert.ifError(err);
                  assert.equal(1, docs.length);

                  BlogPostB.findOne({tags: { '$all': /^two/ }}, function (err, doc) {
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

    it('using #nor with nested #elemMatch', function(done){
      var db = start()
        , P = db.model('BlogPostB', collection + '_norWithNestedElemMatch');

      var p0 = { title: "nested $nor elemMatch1", comments: [] };

      var p1 = { title: "nested $nor elemMatch0", comments: [] };
      p1.comments.push({ title: 'comment X' }, { title: 'comment Y' }, { title: 'comment W' })

      P.create(p0, p1, function (err, post0, post1) {
        assert.ifError(err);

        var id = post1.comments[1]._id;

        var query0 = { comments: { $elemMatch: { title: 'comment Z' }}};
        var query1 = { comments: { $elemMatch: { _id: id.toString(), title: 'comment Y' }}};

        P.find({ $nor: [query0, query1] }, function (err, posts) {
          db.close();
          assert.ifError(err);
          assert.equal(1, posts.length);
          assert.equal(posts[0].id, post0.id);
          done();
        });
      });
    });

    it('strings via regexp', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'Next to Normal'}, function (err, created) {
        assert.ifError(err);
        BlogPostB.findOne({title: /^Next/}, function (err, found) {
          assert.ifError(err);
          assert.equal(found._id.toString(), created._id);

          var reg = '^Next to Normal$';

          BlogPostB.find({ title: { $regex: reg }}, function (err, found) {
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(), created._id);

            BlogPostB.findOne({ title: { $regex: reg }}, function (err, found) {
              assert.ifError(err);
              assert.equal(found._id.toString(), created._id);

              BlogPostB.where('title').regex(reg).findOne(function (err, found) {
                assert.ifError(err);
                assert.equal(found._id.toString(), created._id);

                BlogPostB.where('title').regex(/^Next/).findOne(function (err, found) {
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

    it('a document whose arrays contain at least $all values', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);
      var a1 = {numbers: [-1,-2,-3,-4], meta: { visitors: 4 }};
      var a2 = {numbers: [0,-1,-2,-3,-4]};
      BlogPostB.create(a1, a2, function (err, whereoutZero, whereZero) {
        assert.ifError(err);

        BlogPostB.find({numbers: {$all: [-1, -2, -3, -4]}}, function (err, found) {
          assert.ifError(err);
          assert.equal(2, found.length);
          BlogPostB.find({'meta.visitors': {$all: [4] }}, function (err, found) {
            assert.ifError(err);
            assert.equal(1, found.length);
            assert.equal(found[0]._id.toString(), whereoutZero._id);
            BlogPostB.find({numbers: {$all: [0, -1]}}, function (err, found) {
              db.close();
              assert.ifError(err);
              assert.equal(1, found.length);
              assert.equal(found[0]._id.toString(), whereZero._id);
              done();
            });
          });
        });
      });
    });

    it('where $size', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({numbers: [1,2,3,4,5,6,7,8,9,10]}, function (err, whereoutZero) {
        assert.ifError(err);
        BlogPostB.create({numbers: [11,12,13,14,15,16,17,18,19,20]}, function (err, whereZero) {
          assert.ifError(err);
          BlogPostB.create({numbers: [1,2,3,4,5,6,7,8,9,10,11]}, function (err, found) {
            assert.ifError(err);
            BlogPostB.find({numbers: {$size: 10}}, function (err, found) {
              assert.ifError(err);
              assert.equal(2, found.length);
              BlogPostB.find({numbers: {$size: 11}}, function (err, found) {
                assert.ifError(err);
                assert.equal(1, found.length);
                db.close();
                done();
              });
            });
          });
        });
      });
    });

    it('$gt, $lt, $lte, $gte work on strings', function(done){
      var db = start()
      var D = db.model('D', new Schema({dt: String}), collection);

      D.create({ dt: '2011-03-30' }, cb);
      D.create({ dt: '2011-03-31' }, cb);
      D.create({ dt: '2011-04-01' }, cb);
      D.create({ dt: '2011-04-02' }, cb);

      var pending = 4;
      function cb (err) {
        if (err) db.close();
        assert.ifError(err);

        if (--pending) return;

        pending = 2;

        D.find({ 'dt': { $gte: '2011-03-30', $lte: '2011-04-01' }}).sort('dt').exec(function (err, docs) {
          if (!--pending) {
            db.close();
            done();
          }
          assert.ifError(err);
          assert.equal(3, docs.length);
          assert.equal(docs[0].dt, '2011-03-30');
          assert.equal(docs[1].dt, '2011-03-31');
          assert.equal(docs[2].dt, '2011-04-01');
          assert.equal(false, docs.some(function (d) { return '2011-04-02' === d.dt }));
        });

        D.find({ 'dt': { $gt: '2011-03-30', $lt: '2011-04-02' }}).sort('dt').exec(function (err, docs) {
          if (!--pending) {
            db.close();
            done();
          }
          assert.ifError(err);
          assert.equal(2, docs.length);
          assert.equal(docs[0].dt, '2011-03-31');
          assert.equal(docs[1].dt, '2011-04-01');
          assert.equal(false, docs.some(function (d) { return '2011-03-30' === d.dt }));
          assert.equal(false, docs.some(function (d) { return '2011-04-02' === d.dt }));
        });
      }

    })
  });

  describe('limit', function(){
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'first limit'}, function (err, first) {
        assert.ifError(err);
        BlogPostB.create({title: 'second limit'}, function (err, second) {
          assert.ifError(err);
          BlogPostB.create({title: 'third limit'}, function (err, third) {
            assert.ifError(err);
            BlogPostB.find({title: /limit$/}).limit(2).find( function (err, found) {
              db.close();
              assert.ifError(err);
              assert.equal(2, found.length);
              assert.equal(found[0].id, first.id);
              assert.equal(found[1].id, second.id);
              done()
            });
          });
        });
      });
    })
  })

  describe('skip', function(){
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({title: 'first skip'}, function (err, first) {
        assert.ifError(err);
        BlogPostB.create({title: 'second skip'}, function (err, second) {
          assert.ifError(err);
          BlogPostB.create({title: 'third skip'}, function (err, third) {
            assert.ifError(err);
            BlogPostB.find({title: /skip$/}).skip(1).limit(2).find( function (err, found) {
              assert.ifError(err);
              assert.equal(2,found.length);
              assert.equal(found[0].id,second._id);
              assert.equal(found[1].id,third._id);
              db.close();
              done();
            });
          });
        });
      });
    })
  });

  describe('sort', function(){
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.create({meta: {visitors: 100}}, function (err, least) {
        assert.ifError(err);
        BlogPostB.create({meta: {visitors: 300}}, function (err, largest) {
          assert.ifError(err);
          BlogPostB.create({meta: {visitors: 200}}, function (err, middle) {
            assert.ifError(err);
            BlogPostB
            .where('meta.visitors').gt(99).lt(301)
            .sort('-meta.visitors')
            .find( function (err, found) {
              assert.ifError(err);
              assert.equal(3, found.length);
              assert.equal(found[0].id, largest._id);
              assert.equal(found[1].id, middle._id);
              assert.equal(found[2].id, least._id);
              db.close();
              done();
            });
          });
        });
      });
    })
  });

  describe('nested mixed "x.y.z"', function(){
    it('works', function(done){
      var db = start()
        , BlogPostB = db.model('BlogPostB', collection);

      BlogPostB.find({ 'mixed.nested.stuff': 'skynet' }, function (err, docs) {
        db.close();
        assert.ifError(err);
        done();
      });
    });
  });

  it('by Date (gh-336)', function(done){
    // GH-336
    var db = start()
      , Test = db.model('TestDateQuery', new Schema({ date: Date }), 'datetest_' + random())
      , now = new Date;

    Test.create({ date: now }, { date: new Date(now-10000) }, function (err, a, b) {
      assert.ifError(err);
      Test.find({ date: now }, function (err, docs) {
        db.close();
        assert.ifError(err);
        assert.equal(1, docs.length);
        done();
      });
    });
  })

  it('mixed types with $elemMatch (gh-591)', function(done){
    var db = start()
      , S = new Schema({ a: [{}], b: Number })
      , M = db.model('QueryingMixedArrays', S, random())

    var m = new M;
    m.a = [1,2,{ name: 'Frodo' },'IDK', {name: 100}];
    m.b = 10;

    m.save(function (err) {
      assert.ifError(err);

      M.find({ a: { name: 'Frodo' }, b: '10' }, function (err, docs) {
        assert.ifError(err);
        assert.equal(5, docs[0].a.length);
        assert.equal(10, docs[0].b.valueOf());

        var query = {
            a: {
                $elemMatch: { name: 100 }
            }
        }

        M.find(query, function (err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(5, docs[0].a.length);
          done();
        });
      });
    });
  });

  describe('$all', function(){
    it('with ObjectIds (gh-690)', function (done) {
      var db = start()

      var SSchema = new Schema({ name: String });
      var PSchema = new Schema({ sub: [SSchema] });

      var P = db.model('usingAllWithObjectIds', PSchema);
      var sub = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];

      P.create({ sub: sub }, function (err, p) {
        assert.ifError(err);

        var o0 = p.sub[0]._id;
        var o1 = p.sub[1]._id;
        var o2 = p.sub[2]._id;

        P.findOne({ 'sub._id': { $all: [o1, o2] }}, function (err, doc) {
          assert.ifError(err);
          assert.equal(doc.id, p.id);

          P.findOne({ 'sub._id': { $all: [o0, new DocumentObjectId] }}, function (err, doc) {
            assert.ifError(err);
            assert.equal(false, !!doc);

            P.findOne({ 'sub._id': { $all: [o2] }}, function (err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              done();
            });
          });
        });
      });
    });

    it('with Dates', function(done){
      this.timeout(3000);
      // this.slow(2000);
      var db = start()

      var SSchema = new Schema({ d: Date });
      var PSchema = new Schema({ sub: [SSchema] });

      var P = db.model('usingAllWithDates', PSchema);
      var sub = [
          { d: new Date }
        , { d: new Date(Date.now()-10000) }
        , { d: new Date(Date.now()-30000) }
      ];

      P.create({ sub: sub }, function (err, p) {
        assert.ifError(err);

        var o0 = p.sub[0].d;
        var o1 = p.sub[1].d;
        var o2 = p.sub[2].d;

        P.findOne({ 'sub.d': { $all: [o1, o2] }}, function (err, doc) {
          assert.ifError(err);
          assert.equal(doc.id,p.id);

          P.findOne({ 'sub.d': { $all: [o0, new Date] }}, function (err, doc) {
            assert.ifError(err);
            assert.equal(false, !!doc);

            P.findOne({ 'sub.d': { $all: [o2] }}, function (err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(doc.id, p.id);
              done();
            });
          });
        });
      });
    });
  });

  describe('and', function(){
    it('works with queries gh-1188', function(done){
      var db = start();
      var B = db.model('BlogPostB');

      B.create({ title: 'and operator', published: false, author: 'Me' }, function (err, doc) {
        assert.ifError(err);

        B.find({ $and: [{ title: 'and operator' }] }, function (err, docs) {
          assert.ifError(err);
          assert.equal(1, docs.length);

          B.find({ $and: [{ title: 'and operator' }, { published: true }] }, function (err, docs) {
            assert.ifError(err);
            assert.equal(0, docs.length);

            B.find({ $and: [{ title: 'and operator' }, { published: false }] }, function (err, docs) {
              assert.ifError(err);
              assert.equal(1, docs.length);

              var query = B.find()
              query.and([
                  { title: 'and operator', published: false }
                , { author: 'Me' }
              ])
              query.exec(function (err, docs) {
                assert.ifError(err);
                assert.equal(1, docs.length);

                var query = B.find()
                query.and([
                    { title: 'and operator', published: false }
                  , { author: 'You' }
                ])
                query.exec(function (err, docs) {
                  assert.ifError(err);
                  assert.equal(0, docs.length);
                  done();
                });
              });
            });
          });
        });
      })
    })
  })
});

describe('buffers', function(){
  it('works with different methods and query types', function(done){
    var db = start()
      , BufSchema = new Schema({ name: String, block: Buffer })
      , Test = db.model('Buffer', BufSchema, "buffers");

    var docA = { name: 'A', block: new Buffer('über') };
    var docB = { name: 'B', block: new Buffer("buffer shtuffs are neat") };
    var docC = { name: 'C', block: 'hello world' };

    Test.create(docA, docB, docC, function (err, a, b, c) {
      assert.ifError(err);
      assert.equal(b.block.toString('utf8'),'buffer shtuffs are neat');
      assert.equal(a.block.toString('utf8'),'über');
      assert.equal(c.block.toString('utf8'),'hello world');

      Test.findById(a._id, function (err, a) {
        assert.ifError(err);
        assert.equal(a.block.toString('utf8'),'über');

        Test.findOne({ block: 'buffer shtuffs are neat' }, function (err, rb) {
          assert.ifError(err);
          assert.equal(rb.block.toString('utf8'),'buffer shtuffs are neat');

          Test.findOne({ block: /buffer/i }, function (err, rb) {
            assert.equal(err.message, 'Cast to buffer failed for value "/buffer/i"')
            Test.findOne({ block: [195, 188, 98, 101, 114] }, function (err, rb) {
              assert.ifError(err);
              assert.equal(rb.block.toString('utf8'),'über');

              Test.findOne({ block: 'aGVsbG8gd29ybGQ=' }, function (err, rb) {
                assert.ifError(err);
                assert.strictEqual(rb, null);

                Test.findOne({ block: new Buffer('aGVsbG8gd29ybGQ=', 'base64') }, function (err, rb) {
                  assert.ifError(err);
                  assert.equal(rb.block.toString('utf8'),'hello world');

                  Test.findOne({ block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') }, function (err, rb) {
                    assert.ifError(err);
                    assert.equal(rb.block.toString('utf8'),'hello world');

                    Test.remove({}, function (err) {
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

  it('with conditionals', function(done){
    // $in $nin etc
    var db = start()
      , BufSchema = new Schema({ name: String, block: Buffer })
      , Test = db.model('Buffer2', BufSchema, "buffer_"+random());

    var docA = { name: 'A', block: new MongooseBuffer([195, 188, 98, 101, 114]) }; //über
    var docB = { name: 'B', block: new MongooseBuffer("buffer shtuffs are neat") };
    var docC = { name: 'C', block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') };

    Test.create(docA, docB, docC, function (err, a, b, c) {
      assert.ifError(err);
      assert.equal(a.block.toString('utf8'),'über');
      assert.equal(b.block.toString('utf8'),'buffer shtuffs are neat');
      assert.equal(c.block.toString('utf8'),'hello world')

      Test.find({ block: { $in: [[195, 188, 98, 101, 114], "buffer shtuffs are neat", new Buffer('aGVsbG8gd29ybGQ=', 'base64')] }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(3, tests.length);
      });

      Test.find({ block: { $in: ['über', 'hello world'] }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(2, tests.length);
      });

      Test.find({ block: { $in: ['über'] }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(1, tests.length);
        assert.equal(tests[0].block.toString('utf8'),'über');
      });

      Test.find({ block: { $nin: ['über'] }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(2, tests.length);
      });

      Test.find({ block: { $nin: [[195, 188, 98, 101, 114], new Buffer('aGVsbG8gd29ybGQ=', 'base64')] }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(1, tests.length);
        assert.equal(tests[0].block.toString('utf8'),'buffer shtuffs are neat');
      });

      Test.find({ block: { $ne: 'über' }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(2, tests.length);
      });

      Test.find({ block: { $gt: 'über' }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(2, tests.length);
      });

      Test.find({ block: { $gte: 'über' }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(3, tests.length);
      });

      Test.find({ block: { $lt: new Buffer('buffer shtuffs are neat') }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(2, tests.length);
        assert.equal(tests[0].block.toString('utf8'),'über');
      });

      Test.find({ block: { $lte: 'buffer shtuffs are neat' }}, function (err, tests) {
        cb();
        assert.ifError(err);
        assert.equal(3, tests.length);
      });

      var pending = 9;
      function cb () {
        if (--pending) return;
        Test.remove({}, function (err) {
          db.close();
          assert.ifError(err);
          done();
        });
      }
    });
  });
})

describe('backwards compatibility', function(){
  it('with previously existing null values in the db', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB();

    post.collection.insert({ meta: { visitors: 9898, a: null } }, {}, function (err, b) {
      assert.ifError(err);

      BlogPostB.findOne({_id: b[0]._id}, function (err, found) {
        assert.ifError(err);
        assert.equal(9898, found.get('meta.visitors').valueOf());
        db.close();
        done();
      })
    })
  });

  it('with unused values in the db', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB();

    post.collection.insert({ meta: { visitors: 9898, color: 'blue'}}, {}, function (err, b) {
      assert.ifError(err);

      BlogPostB.findOne({_id: b[0]._id}, function (err, found) {
        assert.ifError(err);
        assert.equal(9898, found.get('meta.visitors').valueOf());
        found.save(function (err) {
          assert.ifError(err);
          db.close();
          done();
        })
      })
    })
  });
});

describe('geo-spatial', function(){
  it('$near (gh-309)', function(done){
    var db = start()
      , Test = db.model('Geo1', geoSchema, 'geospatial'+random());

    Test.create({ loc: [ 10, 20 ]}, { loc: [ 40, 90 ]}, function (err) {
      assert.ifError(err);
      setTimeout(function () {
        Test.find({ loc: { $near: [30, 40] }}, function (err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(2, docs.length);
          done();
        });
      }, 100);
    });
  });

  it('$within arrays (gh-586)', function(done){
    var db = start()
      , Test = db.model('Geo2', geoSchema, collection + 'geospatial');

    Test.create({ loc: [ 35, 50 ]}, { loc: [ -40, -90 ]}, function (err) {
      assert.ifError(err);
      setTimeout(function () {
        Test.find({ loc: { '$within': { '$box': [[30,40], [40,60]] }}}, function (err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(1, docs.length);
          done()
        });
      }, 100);
    });
  });

  it('$nearSphere with arrays (gh-610)', function(done){
    var db = start()
      , Test = db.model('Geo3', geoSchema, "y"+random());

    Test.create({ loc: [ 10, 20 ]}, { loc: [ 40, 90 ]}, function (err) {
      assert.ifError(err);
      setTimeout(function () {
        Test.find({ loc: { $nearSphere: [30, 40] }}, function (err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(2, docs.length);
          done()
        });
      }, 100);
    });
  });

  it('$maxDistance with arrays', function(done){
    var db = start()
      , Test = db.model('Geo4', geoSchema, "x"+random());

    Test.create({ loc: [ 20, 80 ]}, { loc: [ 25, 30 ]}, function (err, docs) {
      assert.ifError(err);
      setTimeout(function () {
        Test.find({ loc: { $near: [25, 31], $maxDistance: 1 }}, function (err, docs) {
          assert.ifError(err);
          assert.equal(1, docs.length);
          Test.find({ loc: { $near: [25, 32], $maxDistance: 1 }}, function (err, docs) {
            db.close();
            assert.ifError(err);
            assert.equal(0, docs.length);
            done();
          });
        });
      }, 100);
    });
  })
});

describe('lean option:', function(){
  it('find', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Wooooot ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      assert.ifError(err);
      BlogPostB.find({title : title}).lean().exec(function(err, docs){
        assert.ifError(err);
        assert.equal(docs.length, 1);
        assert.strictEqual(docs[0] instanceof mongoose.Document, false);
        BlogPostB.find({title : title}, null, { lean : true }, function(err, docs){
          assert.ifError(err);
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0] instanceof mongoose.Document, false);
          db.close();
          done();
        });
      });
    });
  });

  it('findOne', function(done){
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Wooooot ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      assert.ifError(err);
      BlogPostB.findOne({title : title}, null, { lean : true }, function(err, doc){
        db.close();
        assert.ifError(err);
        assert.ok(doc);
        assert.strictEqual(false, doc instanceof mongoose.Document);
        done();
      });
    });
  });

})
