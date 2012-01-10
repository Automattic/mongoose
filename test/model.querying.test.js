
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
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

var Comments = new Schema();

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
});
mongoose.model('Mod', ModSchema);

var geoSchema = new Schema({ loc: { type: [Number], index: '2d'}});

module.exports = {

  'test that find returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    // query
    BlogPostB.find({}).should.be.an.instanceof(Query);

    // query, fields
    BlogPostB.find({}, {}).should.be.an.instanceof(Query);

    // query, fields (array)
    BlogPostB.find({}, []).should.be.an.instanceof(Query);

    // query, fields, options
    BlogPostB.find({}, {}, {}).should.be.an.instanceof(Query);

    // query, fields (array), options
    BlogPostB.find({}, [], {}).should.be.an.instanceof(Query);

    db.close();
  },

  'test that findOne returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    // query
    BlogPostB.findOne({}).should.be.an.instanceof(Query);

    // query, fields
    BlogPostB.findOne({}, {}).should.be.an.instanceof(Query);

    // query, fields (array)
    BlogPostB.findOne({}, []).should.be.an.instanceof(Query);

    // query, fields, options
    BlogPostB.findOne({}, {}, {}).should.be.an.instanceof(Query);

    // query, fields (array), options
    BlogPostB.findOne({}, [], {}).should.be.an.instanceof(Query);

    db.close();
  },

  'test that an empty find does not hang': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)

    function fn () {
      db.close();
    };

    BlogPostB.find({}, fn);
  },

  'test that a query is executed when a callback is passed': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      --count || db.close();
    };

    // query
    BlogPostB.find(q, fn).should.be.an.instanceof(Query);

    // query, fields
    BlogPostB.find(q, {}, fn).should.be.an.instanceof(Query);

    // query, fields (array)
    BlogPostB.find(q, [], fn).should.be.an.instanceof(Query);

    // query, fields, options
    BlogPostB.find(q, {}, {}, fn).should.be.an.instanceof(Query);

    // query, fields (array), options
    BlogPostB.find(q, [], {}, fn).should.be.an.instanceof(Query);
  },

  'test that query is executed where a callback for findOne': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      --count || db.close();
    };

    // query
    BlogPostB.findOne(q, fn).should.be.an.instanceof(Query);

    // query, fields
    BlogPostB.findOne(q, {}, fn).should.be.an.instanceof(Query);

    // query, fields (array)
    BlogPostB.findOne(q, [], fn).should.be.an.instanceof(Query);

    // query, fields, options
    BlogPostB.findOne(q, {}, {}, fn).should.be.an.instanceof(Query);

    // query, fields (array), options
    BlogPostB.findOne(q, [], {}, fn).should.be.an.instanceof(Query);
  },

  'test that count returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.count({}).should.be.an.instanceof(Query);

    db.close();
  },

  'test that count Query executes when you pass a callback': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , pending = 2

    function fn () {
      if (--pending) return;
      db.close();
    };

    BlogPostB.count({}, fn).should.be.an.instanceof(Query);
    BlogPostB.count(fn).should.be.an.instanceof(Query);
  },

  'test that distinct returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.distinct('title', {}).should.be.an.instanceof(Query);

    db.close();
  },

  'test that distinct Query executes when you pass a callback': function () {
    var db = start();
    var Address = new Schema({ zip: String });
    Address = db.model('Address', Address, 'addresses_' + random());

    Address.create({ zip: '10010'}, { zip: '10010'}, { zip: '99701'}, function (err, a1, a2, a3) {
      should.strictEqual(null, err);
      var query = Address.distinct('zip', {}, function (err, results) {
        should.strictEqual(null, err);
        results.should.eql(['10010', '99701']);
        db.close();
      });
      query.should.be.an.instanceof(Query);
    });
  },


  'test that update returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.update({}, {}).should.be.an.instanceof(Query);
    BlogPostB.update({}, {}, {}).should.be.an.instanceof(Query);

    db.close();
  },

  'test that update Query executes when you pass a callback': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 2;

    function fn () {
      --count || db.close();
    };

    BlogPostB.update({title: random()}, {}, fn).should.be.an.instanceof(Query);

    BlogPostB.update({title: random()}, {}, {}, fn).should.be.an.instanceof(Query);
  },

  'test finding a document': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Wooooot ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ title: title }, function (err, doc) {
        should.strictEqual(err, null);
        doc.get('title').should.eql(title);
        doc.isNew.should.be.false;

        db.close();
      });
    });
  },

  'test finding a document byId': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Edwald ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      var pending = 2;

      BlogPostB.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        doc.should.be.an.instanceof(BlogPostB);
        doc.get('title').should.eql(title);
        --pending || db.close();
      });

      BlogPostB.findById(post.get('_id').toHexString(), function (err, doc) {
        should.strictEqual(err, null);
        doc.should.be.an.instanceof(BlogPostB);
        doc.get('title').should.eql(title);
        --pending || db.close();
      });
    });
  },

  'test finding documents': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Wooooot ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        should.strictEqual(err, null);

        BlogPostB.find({ title: title }, function (err, docs) {
          should.strictEqual(err, null);
          docs.should.have.length(2);

          docs[0].get('title').should.eql(title);
          docs[0].isNew.should.be.false;

          docs[1].get('title').should.eql(title);
          docs[1].isNew.should.be.false;

          db.close();
        });
      });
    });
  },

  'test finding documents where an array that contains one specific member': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    BlogPostB.create({numbers: [100, 101, 102]}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.find({numbers: 100}, function (err, found) {
        should.strictEqual(err, null);
        found.should.have.length(1);
        found[0]._id.should.eql(created._id);
        db.close();
      });
    });
  },

  'test counting documents': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Wooooot ' + random();

    var post = new BlogPostB();
    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      var post = new BlogPostB();
      post.set('title', title);

      post.save(function (err) {
        should.strictEqual(err, null);

        BlogPostB.count({ title: title }, function (err, count) {
          should.strictEqual(err, null);

          count.should.be.a('number');
          count.should.eql(2);

          db.close();
        });
      });
    });
  },

  'test query casting': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , title = 'Loki ' + random();

    var post = new BlogPostB()
      , id = DocumentObjectId.toString(post.get('_id'));

    post.set('title', title);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ _id: id }, function (err, doc) {
        should.strictEqual(err, null);

        doc.get('title').should.equal(title);
        db.close();
      });
    });
  },

  'test a query that includes a casting error': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.find({ date: 'invalid date' }, function (err) {
      err.should.be.an.instanceof(Error);
      err.should.be.an.instanceof(CastError);
      db.close();
    });
  },

  'test findOne queries that require casting for $modifiers': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB({
          meta: {
            visitors: -10
          }
        });

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ 'meta.visitors': { $gt: '-20', $lt: -1 } }, 
      function (err, found) {
        found.get('meta.visitors')
             .valueOf().should.equal(post.get('meta.visitors').valueOf());
        found.id;
        found.get('_id').should.eql(post.get('_id'));
        db.close();
      });
    });
  },

  'test find queries that require casting for $modifiers': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB({
          meta: {
            visitors: -75
          }
        });

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.find({ 'meta.visitors': { $gt: '-100', $lt: -50 } },
      function (err, found) {
        should.strictEqual(err, null);

        found.should.have.length(1);
        found[0].get('_id').should.eql(post.get('_id'));
        found[0].get('meta.visitors').valueOf()
                .should.equal(post.get('meta.visitors').valueOf());
        db.close();
      });
    });
  },

  // GH-199
  'test find queries where $in cast the values wherein the array': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    var post = new BlogPostB()
      , id = DocumentObjectId.toString(post._id);

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ _id: { $in: [id] } }, function (err, doc) {
        should.strictEqual(err, null);

        DocumentObjectId.toString(doc._id).should.eql(id);
        db.close();
      });
    });
  },

  // GH-232
  'test find queries where $nin cast the values wherein the array': function () {
    var db = start()
      , NinSchema = new Schema({
          num: Number
        });
    mongoose.model('Nin', NinSchema);
    var Nin = db.model('Nin', 'nins_' + random());
    Nin.create({ num: 1 }, function (err, one) {
      should.strictEqual(err, null);
      Nin.create({ num: 2 }, function (err, two) {
        should.strictEqual(err, null);
        Nin.create({num: 3}, function (err, three) {
          should.strictEqual(err, null);
          Nin.find({ num: {$nin: [2]}}, function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(2);
            db.close();
          });
        });
      });
    });
  },

  'test find queries with $ne with single value against array': function () {
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
      should.strictEqual(err, null);
      NE.create({ ids: [id2, id4], b: id3 },function (err, ne2) {
        should.strictEqual(err, null);

        var query = NE.find({ 'b': id3.toString(), 'ids': { $ne: id1 }});
        query.run(function (err, nes1) {
          should.strictEqual(err, null);
          nes1.length.should.eql(1);

          NE.find({ b: { $ne: [1] }}, function (err, nes2) {
            err.message.should.eql("Invalid ObjectId");

            NE.find({ b: { $ne: 4 }}, function (err, nes3) {
              err.message.should.eql("Invalid ObjectId");

              NE.find({ b: id3, ids: { $ne: id4 }}, function (err, nes4) {
                db.close();
                should.strictEqual(err, null);
                nes4.length.should.eql(0);
              });
            });
          });
        });

      });
    });

  },

  'test for findById where partial initialization': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , queries = 5;

    var post = new BlogPostB();

    post.title = 'hahaha';
    post.slug = 'woot';
    post.meta.visitors = 53;
    post.tags = ['humidity', 'soggy'];

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.true;
        doc.isInit('date').should.be.false;
        doc.isInit('meta.visitors').should.be.true;
        doc.meta.visitors.valueOf().should.equal(53);
        doc.tags.length.should.equal(2);
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), ['title'], function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.false;
        doc.isInit('date').should.be.false;
        doc.isInit('meta.visitors').should.be.false;
        should.strictEqual(undefined, doc.meta.visitors);
        should.strictEqual(undefined, doc.tags);
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), { slug: 0 }, function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.false;
        doc.isInit('date').should.be.false;
        doc.isInit('meta.visitors').should.be.true;
        doc.meta.visitors.valueOf().should.equal(53);
        doc.tags.length.should.equal(2);
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), { title:1 }, function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.false;
        doc.isInit('date').should.be.false;
        doc.isInit('meta.visitors').should.be.false;
        should.strictEqual(undefined, doc.meta.visitors);
        should.strictEqual(undefined, doc.tags);
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), ['slug'], function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.false;
        doc.isInit('slug').should.be.true;
        doc.isInit('date').should.be.false;
        doc.isInit('meta.visitors').should.be.false;
        should.strictEqual(undefined, doc.meta.visitors);
        should.strictEqual(undefined, doc.tags);
        --queries || db.close();
      });
    });
  },

  'findOne where subset of fields excludes _id': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    BlogPostB.create({title: 'subset 1'}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findOne({title: 'subset 1'}, {title: 1, _id: 0}, function (err, found) {
        should.strictEqual(err, null);
        should.strictEqual(undefined, found._id);
        found.title.should.equal('subset 1');
        db.close();
      });
    });
  },

  'test find where subset of fields, excluding _id': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    BlogPostB.create({title: 'subset 1', author: 'me'}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.find({title: 'subset 1'}, {title: 1, _id: 0}, function (err, found) {
        should.strictEqual(err, null);
        should.strictEqual(undefined, found[0]._id);
        found[0].title.should.equal('subset 1');
        should.strictEqual(undefined, found[0].def);
        should.strictEqual(undefined, found[0].author);
        should.strictEqual(false, Array.isArray(found[0].comments));
        db.close();
      });
    });
  },

  // gh-541
  'find subset of fields excluding embedded doc _id': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: 'LOTR', comments: [{ title: ':)' }]}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.find({_id: created}, { _id: 0, 'comments._id': 0 }, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        should.strictEqual(undefined, found[0]._id);
        found[0].title.should.equal('LOTR');
        should.strictEqual('kandinsky', found[0].def);
        should.strictEqual(undefined, found[0].author);
        should.strictEqual(true, Array.isArray(found[0].comments));
        found[0].comments.length.should.equal(1);
        found[0].comments[0].title.should.equal(':)');
        should.strictEqual(undefined, found[0].comments[0]._id);
        // gh-590
        should.strictEqual(null, found[0].comments[0].id);
      });
    });
  },


  'exluded fields should be undefined': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , date = new Date

    BlogPostB.create({title: 'subset 1', author: 'me', meta: { date: date }}, function (err, created) {
      should.strictEqual(err, null);
      var id = created.id;
      BlogPostB.findById(created.id, {title: 0, 'meta.date': 0, owners: 0}, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        found.id;
        found._id.should.eql(created._id);
        should.strictEqual(undefined, found.title);
        should.strictEqual('kandinsky', found.def);
        should.strictEqual('me', found.author);
        should.strictEqual(true, Array.isArray(found.comments));
        should.equal(undefined, found.meta.date);
        found.comments.length.should.equal(0);
        should.equal(undefined, found.owners);
      });
    });
  },

  'exluded fields should be undefined and defaults applied to other fields': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , id = new DocumentObjectId
      , date = new Date

    BlogPostB.collection.insert({ _id: id, title: 'hahaha1', meta: { date: date }}, function (err) {
      should.strictEqual(err, null);

      BlogPostB.findById(id, {title: 0}, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        found._id.should.eql(id);
        should.strictEqual(undefined, found.title);
        should.strictEqual('kandinsky', found.def);
        should.strictEqual(undefined, found.author);
        should.strictEqual(true, Array.isArray(found.comments));
        should.equal(date.toString(), found.meta.date.toString());
        found.comments.length.should.equal(0);
      });
    });
  },

  'test for find where partial initialization': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , queries = 4;

    var post = new BlogPostB();

    post.title = 'hahaha';
    post.slug = 'woot';

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.find({ _id: post.get('_id') }, function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.true;
        docs[0].isInit('date').should.be.false;
        should.strictEqual('kandinsky', docs[0].def);
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, ['title'], function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.false;
        docs[0].isInit('date').should.be.false;
        should.strictEqual(undefined, docs[0].def);
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, { slug: 0, def: 0 }, function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.false;
        docs[0].isInit('date').should.be.false;
        should.strictEqual(undefined, docs[0].def);
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, ['slug'], function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.false;
        docs[0].isInit('slug').should.be.true;
        docs[0].isInit('date').should.be.false;
        should.strictEqual(undefined, docs[0].def);
        --queries || db.close();
      });
    });
  },

  // GH-204
  'test query casting when finding by Date': function () {
    var db = start()
      , P = db.model('BlogPostB', collection);

    var post = new P;

    post.meta.date = new Date();

    post.save(function (err) {
      should.strictEqual(err, null);

      P.findOne({ _id: post._id, 'meta.date': { $lte: Date.now() } }, function (err, doc) {
        should.strictEqual(err, null);

        DocumentObjectId.toString(doc._id).should.eql(DocumentObjectId.toString(post._id));
        doc.meta.date = null;
        doc.save(function (err) {
          should.strictEqual(err, null);
          P.findById(doc._id, function (err, doc) {
            db.close();
            should.strictEqual(err, null);
            should.strictEqual(doc.meta.date, null);
          });
        });
      });
    });
  },

  // gh-523
  'null boolean default is allowed': function () {
    var db = start()
      , s1 = new Schema({ b: { type: Boolean, default: null }})
      , M1 = db.model('NullDateDefaultIsAllowed1', s1)
      , s2 = new Schema({ b: { type: Boolean, default: false }})
      , M2 = db.model('NullDateDefaultIsAllowed2', s2)
      , s3 = new Schema({ b: { type: Boolean, default: true }})
      , M3 = db.model('NullDateDefaultIsAllowed3', s3)

    db.close();

    var m1 = new M1;
    should.strictEqual(null, m1.b);
    var m2 = new M2;
    should.strictEqual(false, m2.b);
    var m3 = new M3;
    should.strictEqual(true, m3.b);
  },

  // GH-220
  'test querying if an array contains at least a certain single member': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    var post = new BlogPostB();

    post.tags.push('cat');

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({tags: 'cat'}, function (err, doc) {
        should.strictEqual(err, null);

        doc.id;
        doc._id.should.eql(post._id);
        db.close();
      });
    });
  },

  'test querying if an array contains one of multiple members $in a set': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    var post = new BlogPostB();

    post.tags.push('football');

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({tags: {$in: ['football', 'baseball']}}, function (err, doc) {
        should.strictEqual(err, null);
        doc.id;
        doc._id.should.eql(post._id);

        BlogPostB.findOne({ _id: post._id, tags: /otba/i }, function (err, doc) {
          should.strictEqual(err, null);
          doc.id;
          doc._id.should.eql(post._id);

          db.close();
        })
      });
    });
  },

  'test querying if an array contains one of multiple members $in a set 2': function () {
    var db = start()
      , BlogPostA = db.model('BlogPostB', collection)

    var post = new BlogPostA({ tags: ['gooberOne'] });

    post.save(function (err) {
      should.strictEqual(err, null);

      var query = {tags: {$in:[ 'gooberOne' ]}};

      BlogPostA.findOne(query, function (err, returned) {
        done();
        should.strictEqual(err, null);
        ;(!!~returned.tags.indexOf('gooberOne')).should.be.true;
        returned.id;
        returned._id.should.eql(post._id);
      });
    });

    post.collection.insert({ meta: { visitors: 9898, a: null } }, {}, function (err, b) {
      should.strictEqual(err, null);

      BlogPostA.findOne({_id: b[0]._id}, function (err, found) {
        done();
        should.strictEqual(err, null);
        found.get('meta.visitors').valueOf().should.eql(9898);
      })
    });

    var pending = 2;
    function done () {
      if (--pending) return;
      db.close();
    }
  },

  'test querying via $where a string': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({ title: 'Steve Jobs', author: 'Steve Jobs'}, function (err, created) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ $where: "this.title && this.title === this.author" }, function (err, found) {
        should.strictEqual(err, null);

        found.id;
        found._id.should.eql(created._id);
        db.close();
      });
    });
  },

  'test querying via $where a function': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({ author: 'Atari', slug: 'Atari'}, function (err, created) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ $where: function () {
        return (this.author && this.slug && this.author === this.slug);
      } }, function (err, found) {
        should.strictEqual(err, null);

        found.id;
        found._id.should.eql(created._id);
        db.close();
      });
    });
  },

  'test find where $exists': function () {
    var db = start()
      , ExistsSchema = new Schema({
            a: Number
          , b: String
        });
    mongoose.model('Exists', ExistsSchema);
    var Exists = db.model('Exists', 'exists_' + random());
    Exists.create({ a: 1}, function (err, aExisting) {
      should.strictEqual(err, null);
      Exists.create({b: 'hi'}, function (err, bExisting) {
        should.strictEqual(err, null);
        Exists.find({b: {$exists: true}}, function (err, docs) {
          should.strictEqual(err, null);
          db.close();
          docs.should.have.length(1);
        });
      });
    });
  },

  'test finding based on nested fields': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB({
          meta: {
            visitors: 5678
          }
        });

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ 'meta.visitors': 5678 }, function (err, found) {
        should.strictEqual(err, null);
        found.get('meta.visitors')
          .valueOf().should.equal(post.get('meta.visitors').valueOf());
        found.id;
        found.get('_id').should.eql(post.get('_id'));
        db.close();
      });
    });
  },

  // GH-242
  'test finding based on embedded document fields': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({comments: [{title: 'i should be queryable'}], numbers: [1,2,33333], tags:['yes', 'no']}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findOne({'comments.title': 'i should be queryable'}, function (err, found) {
        should.strictEqual(err, null);
        found.id;
        found._id.should.eql(created._id);

        BlogPostB.findOne({'comments.0.title': 'i should be queryable'}, function (err, found) {
          should.strictEqual(err, null);
          found.id;
          found._id.should.eql(created._id);

          // GH-463
          BlogPostB.findOne({'numbers.2': 33333}, function (err, found) {
            should.strictEqual(err, null);
            found.id;
            found._id.should.eql(created._id);

            BlogPostB.findOne({'tags.1': 'no'}, function (err, found) {
              should.strictEqual(err, null);
              found.id;
              found._id.should.eql(created._id);
              db.close();
            });
          });
        });
      });
    });
  },

  // GH-389
  'find nested doc using string id': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({comments: [{title: 'i should be queryable by _id'}, {title:'me too me too!'}]}, function (err, created) {
      should.strictEqual(err, null);
      var id = created.comments[1]._id.toString();
      BlogPostB.findOne({'comments._id': id}, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        should.strictEqual(!! found, true, 'Find by nested doc id hex string fails');
        found.id;
        found._id.should.eql(created._id);
      });
    });
  },

  'test finding where $elemMatch': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , dateAnchor = +new Date;

    BlogPostB.create({comments: [{title: 'elemMatch', date: dateAnchor + 5}]}, function (err, createdAfter) {
      should.strictEqual(err, null);
      BlogPostB.create({comments: [{title: 'elemMatch', date: dateAnchor - 5}]}, function (err, createdBefore) {
        should.strictEqual(err, null);
        BlogPostB.find({'comments': {'$elemMatch': {title: 'elemMatch', date: {$gt: dateAnchor}}}}, 
          function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(1);
            found[0]._id.should.eql(createdAfter._id);
            db.close();
          }
        );
      });
    });
  },

  'test finding where $mod': function () {
    var db = start()
      , Mod = db.model('Mod', 'mods_' + random());
    Mod.create({num: 1}, function (err, one) {
      should.strictEqual(err, null);
      Mod.create({num: 2}, function (err, two) {
        should.strictEqual(err, null);
        Mod.find({num: {$mod: [2, 1]}}, function (err, found) {
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(one._id);
          db.close();
        });
      });
    });
  },

  'test finding where $not': function () {
    var db = start()
      , Mod = db.model('Mod', 'mods_' + random());
    Mod.create({num: 1}, function (err, one) {
      should.strictEqual(err, null);
      Mod.create({num: 2}, function (err, two) {
        should.strictEqual(err, null);
        Mod.find({num: {$not: {$mod: [2, 1]}}}, function (err, found) {
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(two._id);
          db.close();
        });
      });
    });
  },

  'test finding where $or': function () {
    var db = start()
      , Mod = db.model('Mod', 'mods_' + random());

    Mod.create({num: 1}, {num: 2, str: 'two'}, function (err, one, two) {
      should.strictEqual(err, null);

      var pending = 3;
      test1();
      test2();
      test3();

      function test1 () {
        Mod.find({$or: [{num: 1}, {num: 2}]}, function (err, found) {
          done();
          should.strictEqual(err, null);
          found.should.have.length(2);
          found[0]._id.should.eql(one._id);
          found[1]._id.should.eql(two._id);
        });
      }

      function test2 () {
        Mod.find({ $or: [{ str: 'two'}, {str:'three'}] }, function (err, found) {
          if (err) console.error(err);
          done();
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(two._id);
        });
      }

      function test3 () {
        Mod.find({$or: [{num: 1}]}).$or([{ str: 'two' }]).run(function (err, found) {
          if (err) console.error(err);
          done();
          should.strictEqual(err, null);
          found.should.have.length(2);
          found[0]._id.should.eql(one._id);
          found[1]._id.should.eql(two._id);
        });
      }

      function done () {
        if (--pending) return;
        db.close();
      }
    });
  },

  'finding where #nor': function () {
    var db = start()
      , Mod = db.model('Mod', 'nor_' + random());

    Mod.create({num: 1}, {num: 2, str: 'two'}, function (err, one, two) {
      should.strictEqual(err, null);

      var pending = 3;
      test1();
      test2();
      test3();

      function test1 () {
        Mod.find({$nor: [{num: 1}, {num: 3}]}, function (err, found) {
          done();
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(two._id);
        });
      }

      function test2 () {
        Mod.find({ $nor: [{ str: 'two'}, {str:'three'}] }, function (err, found) {
          done();
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(one._id);
        });
      }

      function test3 () {
        Mod.find({$nor: [{num: 2}]}).$nor([{ str: 'two' }]).run(function (err, found) {
          done();
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(one._id);
        });
      }

      function done () {
        if (--pending) return;
        db.close();
      }
    });
  },

  'test finding where $ne': function () {
    var db = start()
      , Mod = db.model('Mod', 'mods_' + random());
    Mod.create({num: 1}, function (err, one) {
      should.strictEqual(err, null);
      Mod.create({num: 2}, function (err, two) {
        should.strictEqual(err, null);
        Mod.create({num: 3}, function (err, three) {
          should.strictEqual(err, null);
          Mod.find({num: {$ne: 1}}, function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(2);
            found[0]._id.should.eql(two._id);
            found[1]._id.should.eql(three._id);
            db.close();
          });
        });
      });
    });
  },

  'test finding null matches null and undefined': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection + random());

    BlogPostB.create(
        { title: 'A', author: null }
      , { title: 'B' }, function (err, createdA, createdB) {
      should.strictEqual(err, null);
      BlogPostB.find({author: null}, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        found.should.have.length(2);
      });
    });
  },

  'test finding STRICT null matches': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection + random());

    BlogPostB.create(
        { title: 'A', author: null}
      , { title: 'B' }, function (err, createdA, createdB) {
      should.strictEqual(err, null);
      BlogPostB.find({author: {$in: [null], $exists: true}}, function (err, found) {
        db.close();
        should.strictEqual(err, null);
        found.should.have.length(1);
        found[0]._id.should.eql(createdA._id);
      });
    });
  },

  'setting a path to undefined should retain the value as undefined': function () {
    var db = start()
      , B = db.model('BlogPostB', collection + random())

    var doc = new B;
    doc.title='css3';
    doc._delta().$set.title.should.equal('css3');
    doc.title = undefined;
    doc._delta().$unset.title.should.equal(1);
    should.strictEqual(undefined, doc._delta().$set);

    doc.title='css3';
    doc.author = 'aaron';
    doc.numbers = [3,4,5];
    doc.meta.date = new Date;
    doc.meta.visitors = 89;
    doc.comments = [{ title: 'thanksgiving', body: 'yuuuumm' }];
    doc.comments.push({ title: 'turkey', body: 'cranberries' });

    doc.save(function (err) {
      should.strictEqual(null, err);
      B.findById(doc._id, function (err, b) {
        should.strictEqual(null, err);
        b.title.should.equal('css3');
        b.author.should.equal('aaron');
        should.equal(b.meta.date.toString(), doc.meta.date.toString());
        b.meta.visitors.valueOf().should.equal(doc.meta.visitors.valueOf());
        b.comments.length.should.equal(2);
        b.comments[0].title.should.equal('thanksgiving');
        b.comments[0].body.should.equal('yuuuumm');
        b.comments[1].title.should.equal('turkey');
        b.comments[1].body.should.equal('cranberries');
        b.title = undefined;
        b.author = null;
        b.meta.date = undefined;
        b.meta.visitors = null;
        b.comments[0].title = null;
        b.comments[0].body = undefined;
        b.save(function (err) {
          should.strictEqual(null, err);
          B.findById(b._id, function (err, b) {
            should.strictEqual(null, err);
            should.strictEqual(undefined, b.title);
            should.strictEqual(null, b.author);

            should.strictEqual(undefined, b.meta.date);
            should.strictEqual(null, b.meta.visitors);
            should.strictEqual(null, b.comments[0].title);
            should.strictEqual(undefined, b.comments[0].body);
            b.comments[1].title.should.equal('turkey');
            b.comments[1].body.should.equal('cranberries');

            b.meta = undefined;
            b.save(function (err) {
              should.strictEqual(null, err);
              B.collection.findOne({ _id: b._id}, function (err, b) {
                db.close();
                should.strictEqual(null, err);
                should.strictEqual(undefined, b.meta);
              });
            });
          });
        });
      });
    });
  },

  'test finding strings via regular expressions': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: 'Next to Normal'}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findOne({title: /^Next/}, function (err, found) {
        should.strictEqual(err, null);
        found.id;
        found._id.should.eql(created._id);

        var reg = '^Next to Normal$';

        BlogPostB.find({ title: { $regex: reg }}, function (err, found) {
          should.strictEqual(err, null);
          found.length.should.equal(1);
          found[0].id;
          found[0]._id.should.eql(created._id);

          BlogPostB.findOne({ title: { $regex: reg }}, function (err, found) {
            should.strictEqual(err, null);
            found.id;
            found._id.should.eql(created._id);

            BlogPostB.where('title').$regex(reg).findOne(function (err, found) {
              should.strictEqual(err, null);
              found.id;
              found._id.should.eql(created._id);

              BlogPostB.where('title').$regex(/^Next/).findOne(function (err, found) {
                db.close();
                should.strictEqual(err, null);
                found.id;
                found._id.should.eql(created._id);
              });
            });
          });
        });
      });
    });
  },

  'test finding a document whose arrays contain at least $all values': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create(
        {numbers: [-1,-2,-3,-4], meta: { visitors: 4 }}
      , {numbers: [0,-1,-2,-3,-4]}
      , function (err, whereoutZero, whereZero) {
      should.strictEqual(err, null);

      BlogPostB.find({numbers: {$all: [-1, -2, -3, -4]}}, function (err, found) {
        should.strictEqual(err, null);
        found.should.have.length(2);
        BlogPostB.find({'meta.visitors': {$all: [4] }}, function (err, found) {
          should.strictEqual(err, null);
          found.should.have.length(1);
          found[0]._id.should.eql(whereoutZero._id);
          BlogPostB.find({numbers: {$all: [0, -1]}}, function (err, found) {
            db.close();
            should.strictEqual(err, null);
            found.should.have.length(1);
            found[0]._id.should.eql(whereZero._id);
          });
        });
      });
    });
  },

  'test finding a document whose arrays contain at least $all string values': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    var post = new BlogPostB({ title: "Aristocats" });

    post.tags.push('onex');
    post.tags.push('twox');
    post.tags.push('threex');

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findById(post._id, function (err, post) {
        should.strictEqual(err, null);

        BlogPostB.find({ title: { '$all': ['Aristocats']}}, function (err, docs) {
          should.strictEqual(err, null);
          docs.length.should.equal(1);

          BlogPostB.find({ title: { '$all': [/^Aristocats/]}}, function (err, docs) {
            should.strictEqual(err, null);
            docs.length.should.equal(1);

            BlogPostB.find({tags: { '$all': ['onex','twox','threex']}}, function (err, docs) {
              should.strictEqual(err, null);
              docs.length.should.equal(1);

              BlogPostB.find({tags: { '$all': [/^onex/i]}}, function (err, docs) {
                should.strictEqual(err, null);
                docs.length.should.equal(1);

                BlogPostB.findOne({tags: { '$all': /^two/ }}, function (err, doc) {
                  db.close();
                  should.strictEqual(err, null);
                  doc.id.should.eql(post.id);
                });
              });
            });
          });
        });
      });

    });
  },

  'find using #all with nested #elemMatch': function () {
    var db = start()
      , P = db.model('BlogPostB', collection + '_nestedElemMatch');

    var post = new P({ title: "nested elemMatch" });
    post.comments.push({ title: 'comment A' }, { title: 'comment B' }, { title: 'comment C' })

    var id0 = post.comments[0]._id;
    var id1 = post.comments[1]._id;
    var id2 = post.comments[2]._id;

    post.save(function (err) {
      should.strictEqual(null, err);

      var query0 = { $elemMatch: { _id: id1, title: 'comment B' }};
      var query1 = { $elemMatch: { _id: id2.toString(), title: 'comment C' }};

      P.findOne({ comments: { $all: [query0, query1] }}, function (err, p) {
        db.close();
        should.strictEqual(null, err);
        p.id.should.equal(post.id);
      });
    });
  },

  'find using #or with nested #elemMatch': function () {
    var db = start()
      , P = db.model('BlogPostB', collection);

    var post = new P({ title: "nested elemMatch" });
    post.comments.push({ title: 'comment D' }, { title: 'comment E' }, { title: 'comment F' })

    var id0 = post.comments[0]._id;
    var id1 = post.comments[1]._id;
    var id2 = post.comments[2]._id;

    post.save(function (err) {
      should.strictEqual(null, err);

      var query0 = { comments: { $elemMatch: { title: 'comment Z' }}};
      var query1 = { comments: { $elemMatch: { _id: id1.toString(), title: 'comment E' }}};

      P.findOne({ $or: [query0, query1] }, function (err, p) {
        db.close();
        should.strictEqual(null, err);
        p.id.should.equal(post.id);
      });
    });
  },

  'find using #nor with nested #elemMatch': function () {
    var db = start()
      , P = db.model('BlogPostB', collection + '_norWithNestedElemMatch');

    var p0 = { title: "nested $nor elemMatch1", comments: [] };

    var p1 = { title: "nested $nor elemMatch0", comments: [] };
    p1.comments.push({ title: 'comment X' }, { title: 'comment Y' }, { title: 'comment W' })

    P.create(p0, p1, function (err, post0, post1) {
      should.strictEqual(null, err);

      var id = post1.comments[1]._id;

      var query0 = { comments: { $elemMatch: { title: 'comment Z' }}};
      var query1 = { comments: { $elemMatch: { _id: id.toString(), title: 'comment Y' }}};

      P.find({ $nor: [query0, query1] }, function (err, posts) {
        db.close();
        should.strictEqual(null, err);
        posts.length.should.equal(1);
        posts[0].id.should.equal(post0.id);
      });
    });

  },

  'test finding documents where an array of a certain $size': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({numbers: [1,2,3,4,5,6,7,8,9,10]}, function (err, whereoutZero) {
      should.strictEqual(err, null);
      BlogPostB.create({numbers: [11,12,13,14,15,16,17,18,19,20]}, function (err, whereZero) {
        should.strictEqual(err, null);
        BlogPostB.create({numbers: [1,2,3,4,5,6,7,8,9,10,11]}, function (err, found) {
          BlogPostB.find({numbers: {$size: 10}}, function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(2);
            BlogPostB.find({numbers: {$size: 11}}, function (err, found) {
              should.strictEqual(err, null);
              found.should.have.length(1);
              db.close();
            });
          });
        });
      });
    });
  },

  'test finding documents where an array where the $slice operator': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({numbers: [500,600,700,800]}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findById(created._id, {numbers: {$slice: 2}}, function (err, found) {
        should.strictEqual(err, null);
        found.id;
        found._id.should.eql(created._id);
        found.numbers.should.have.length(2);
        found.numbers[0].should.equal(500);
        found.numbers[1].should.equal(600);
        BlogPostB.findById(created._id, {numbers: {$slice: -2}}, function (err, found) {
          should.strictEqual(err, null);
          found.id;
          found._id.should.eql(created._id);
          found.numbers.should.have.length(2);
          found.numbers[0].should.equal(700);
          found.numbers[1].should.equal(800);
          BlogPostB.findById(created._id, {numbers: {$slice: [1, 2]}}, function (err, found) {
            should.strictEqual(err, null);
            found.id;
            found._id.should.eql(created._id);
            found.numbers.should.have.length(2);
            found.numbers[0].should.equal(600);
            found.numbers[1].should.equal(700);
            db.close();
          });
        });
      });
    });
  },

  'test finding documents with a specifc Buffer in their array': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({sigs: [new Buffer([1, 2, 3]),
                             new Buffer([4, 5, 6]),
                             new Buffer([7, 8, 9])]}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findOne({sigs: new Buffer([1, 2, 3])}, function (err, found) {
        should.strictEqual(err, null);
        found.id;
        found._id.should.eql(created._id);
        var query = { sigs: { "$in" : [new Buffer([3, 3, 3]), new Buffer([4, 5, 6])] } };
        BlogPostB.findOne(query, function (err, found) {
          should.strictEqual(err, null);
          db.close();
        });
      });
    });
  },

  'test limits': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: 'first limit'}, function (err, first) {
      should.strictEqual(err, null);
      BlogPostB.create({title: 'second limit'}, function (err, second) {
        should.strictEqual(err, null);
        BlogPostB.create({title: 'third limit'}, function (err, third) {
          should.strictEqual(err, null);
          BlogPostB.find({title: /limit$/}).limit(2).find( function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(2);
            found[0]._id.should.eql(first._id);
            found[1]._id.should.eql(second._id);
            db.close();
          });
        });
      });
    });
  },

  'test skips': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: 'first skip'}, function (err, first) {
      should.strictEqual(err, null);
      BlogPostB.create({title: 'second skip'}, function (err, second) {
        should.strictEqual(err, null);
        BlogPostB.create({title: 'third skip'}, function (err, third) {
          should.strictEqual(err, null);
          BlogPostB.find({title: /skip$/}).skip(1).limit(2).find( function (err, found) {
            should.strictEqual(err, null);
            found.should.have.length(2);
            found[0]._id.should.eql(second._id);
            found[1]._id.should.eql(third._id);
            db.close();
          });
        });
      });
    });
  },

  'test sorts': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({meta: {visitors: 100}}, function (err, least) {
      should.strictEqual(err, null);
      BlogPostB.create({meta: {visitors: 300}}, function (err, largest) {
        should.strictEqual(err, null);
        BlogPostB.create({meta: {visitors: 200}}, function (err, middle) {
          should.strictEqual(err, null);
          BlogPostB
            .where('meta.visitors').gt(99).lt(301)
            .sort('meta.visitors', -1)
            .find( function (err, found) {
              should.strictEqual(err, null);
              found.should.have.length(3);
              found[0]._id.should.eql(largest._id);
              found[1]._id.should.eql(middle._id);
              found[2]._id.should.eql(least._id);
              db.close();
            });
        });
      });
    });
  },

  'test backwards compatibility with previously existing null values in db': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB();

    post.collection.insert({ meta: { visitors: 9898, a: null } }, {}, function (err, b) {
      should.strictEqual(err, null);

      BlogPostB.findOne({_id: b[0]._id}, function (err, found) {
        should.strictEqual(err, null);
        found.get('meta.visitors').valueOf().should.eql(9898);
        db.close();
      })
    })
  },

  'test backwards compatibility with unused values in db': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , post = new BlogPostB();

    post.collection.insert({ meta: { visitors: 9898, color: 'blue'}}, {}, function (err, b) {
      should.strictEqual(err, null);

      BlogPostB.findOne({_id: b[0]._id}, function (err, found) {
        should.strictEqual(err, null);
        found.get('meta.visitors').valueOf().should.eql(9898);
        found.save(function (err) {
          should.strictEqual(err, null);
          db.close();
        })
      })
    })
  },

  'test streaming cursors with #each': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: "The Wrestler", tags: ["movie"]}, function (err, wrestler) {
      should.strictEqual(err, null);
      BlogPostB.create({title: "Black Swan", tags: ["movie"]}, function (err, blackswan) {
        should.strictEqual(err, null);
        BlogPostB.create({title: "Pi", tags: ["movie"]}, function (err, pi) {
          should.strictEqual(err, null);
          var found = {};
          BlogPostB
            .find({tags: "movie"})
            .sort('title', -1)
            .each(function (err, post) {
              should.strictEqual(err, null);
              if (post) found[post.title] = 1;
              else {
                found.should.have.property("The Wrestler", 1);
                found.should.have.property("Black Swan", 1);
                found.should.have.property("Pi", 1);
                db.close();
              }
            });
        });
      });
    });
  },

  'test streaming cursors with #each and manual iteration': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({title: "Bleu", tags: ["Krzysztof Kieślowski"]}, function (err, wrestler) {
      should.strictEqual(err, null);
      BlogPostB.create({title: "Blanc", tags: ["Krzysztof Kieślowski"]}, function (err, blackswan) {
        should.strictEqual(err, null);
        BlogPostB.create({title: "Rouge", tags: ["Krzysztof Kieślowski"]}, function (err, pi) {
          should.strictEqual(err, null);
          var found = {};
          BlogPostB
            .find({tags: "Krzysztof Kieślowski"})
            .each(function (err, post, next) {
              should.strictEqual(err, null);
              if (post) {
                found[post.title] = 1;
                process.nextTick(next);
              } else {
                found.should.have.property("Bleu", 1);
                found.should.have.property("Blanc", 1);
                found.should.have.property("Rouge", 1);
                db.close();
              }
            });
        });
      });
    });
  },

  '$gt, $lt, $lte, $gte work on strings': function () {
    var db = start()
    var D = db.model('D', new Schema({dt: String}), collection);

    D.create({ dt: '2011-03-30' }, done);
    D.create({ dt: '2011-03-31' }, done);
    D.create({ dt: '2011-04-01' }, done);
    D.create({ dt: '2011-04-02' }, done);

    var pending = 3;
    function done (err) {
      if (err) db.close();
      should.strictEqual(err, null);

      if (--pending) return;

      pending = 2;

      D.find({ 'dt': { $gte: '2011-03-30', $lte: '2011-04-01' }}).sort('dt', 1).run(function (err, docs) {
        if (--pending) db.close();
        should.strictEqual(err, null);
        docs.length.should.eql(3);
        docs[0].dt.should.eql('2011-03-30');
        docs[1].dt.should.eql('2011-03-31');
        docs[2].dt.should.eql('2011-04-01');
        docs.some(function (d) { return '2011-04-02' === d.dt }).should.be.false;
      });

      D.find({ 'dt': { $gt: '2011-03-30', $lt: '2011-04-02' }}).sort('dt', 1).run(function (err, docs) {
        if (--pending) db.close();
        should.strictEqual(err, null);
        docs.length.should.eql(2);
        docs[0].dt.should.eql('2011-03-31');
        docs[1].dt.should.eql('2011-04-01');
        docs.some(function (d) { return '2011-03-30' === d.dt }).should.be.false;
        docs.some(function (d) { return '2011-04-02' === d.dt }).should.be.false;
      });
    }
  },

  'nested mixed queries (x.y.z)': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.find({ 'mixed.nested.stuff': 'skynet' }, function (err, docs) {
      db.close();
      should.strictEqual(err, null);
    });
  },

  // GH-336
  'finding by Date field works': function () {
    var db = start()
      , Test = db.model('TestDateQuery', new Schema({ date: Date }), 'datetest_' + random())
      , now = new Date;

    Test.create({ date: now }, { date: new Date(now-10000) }, function (err, a, b) {
      should.strictEqual(err, null);
      Test.find({ date: now }, function (err, docs) {
        db.close();
        should.strictEqual(err, null);
        docs.length.should.equal(1);
      });
    });
  },

  // GH-309
  'using $near with Arrays works (geo-spatial)': function () {
    var db = start()
      , Test = db.model('Geo1', geoSchema, 'geospatial'+random());

    Test.create({ loc: [ 10, 20 ]}, { loc: [ 40, 90 ]}, function (err) {
      should.strictEqual(err, null);
      setTimeout(function () {
        Test.find({ loc: { $near: [30, 40] }}, function (err, docs) {
          db.close();
          should.strictEqual(err, null);
          docs.length.should.equal(2);
        });
      }, 700);
    });
  },

  // GH-586
  'using $within with Arrays works (geo-spatial)': function () {
    var db = start()
      , Test = db.model('Geo2', geoSchema, collection + 'geospatial');

    Test.create({ loc: [ 35, 50 ]}, { loc: [ -40, -90 ]}, function (err) {
      should.strictEqual(err, null);
      setTimeout(function () {
        Test.find({ loc: { '$within': { '$box': [[30,40], [40,60]] }}}, function (err, docs) {
          db.close();
          should.strictEqual(err, null);
          docs.length.should.equal(1);
        });
      }, 700);
    });
  },

  // GH-610
  'using nearSphere with Arrays works (geo-spatial)': function () {
    var db = start()
      , Test = db.model('Geo3', geoSchema, "y"+random());

    Test.create({ loc: [ 10, 20 ]}, { loc: [ 40, 90 ]}, function (err) {
      should.strictEqual(err, null);
      setTimeout(function () {
        Test.find({ loc: { $nearSphere: [30, 40] }}, function (err, docs) {
          db.close();
          should.strictEqual(err, null);
          docs.length.should.equal(2);
        });
      }, 700);
    });
  },

  'using $maxDistance with Array works (geo-spatial)': function () {
    var db = start()
      , Test = db.model('Geo4', geoSchema, "x"+random());

    Test.create({ loc: [ 20, 80 ]}, { loc: [ 25, 30 ]}, function (err, docs) {
      should.strictEqual(!!err, false);
      setTimeout(function () {
        Test.find({ loc: { $near: [25, 31], $maxDistance: 1 }}, function (err, docs) {
          should.strictEqual(err, null);
          docs.length.should.equal(1);
          Test.find({ loc: { $near: [25, 32], $maxDistance: 1 }}, function (err, docs) {
            db.close();
            should.strictEqual(err, null);
            docs.length.should.equal(0);
          });
        });
      }, 500);
    });
  },

  '$type tests': function () {
    var db = start()
      , B = db.model('BlogPostB', collection);

    B.find({ title: { $type: "asd" }}, function (err, posts) {
      err.message.should.eql("$type parameter must be Number");

      B.find({ title: { $type: 2 }}, function (err, posts) {
        db.close();
        should.strictEqual(null, err);
        should.strictEqual(Array.isArray(posts), true);
      });
    });
  },

  'buffers find using available types': function () {
    var db = start()
      , BufSchema = new Schema({ name: String, block: Buffer })
      , Test = db.model('Buffer', BufSchema, "buffers");

    var docA = { name: 'A', block: new Buffer('über') };
    var docB = { name: 'B', block: new Buffer("buffer shtuffs are neat") };
    var docC = { name: 'C', block: 'hello world' };

    Test.create(docA, docB, docC, function (err, a, b, c) {
      should.strictEqual(err, null);
      b.block.toString('utf8').should.equal('buffer shtuffs are neat');
      a.block.toString('utf8').should.equal('über');
      c.block.toString('utf8').should.equal('hello world');

      Test.findById(a._id, function (err, a) {
        should.strictEqual(err, null);
        a.block.toString('utf8').should.equal('über');

        Test.findOne({ block: 'buffer shtuffs are neat' }, function (err, rb) {
          should.strictEqual(err, null);
          rb.block.toString('utf8').should.equal('buffer shtuffs are neat');

          Test.findOne({ block: /buffer/i }, function (err, rb) {
            err.message.should.eql('Cast to buffer failed for value "/buffer/i"')
            Test.findOne({ block: [195, 188, 98, 101, 114] }, function (err, rb) {
              should.strictEqual(err, null);
              rb.block.toString('utf8').should.equal('über');

              Test.findOne({ block: 'aGVsbG8gd29ybGQ=' }, function (err, rb) {
                should.strictEqual(err, null);
                should.strictEqual(rb, null);

                Test.findOne({ block: new Buffer('aGVsbG8gd29ybGQ=', 'base64') }, function (err, rb) {
                  should.strictEqual(err, null);
                  rb.block.toString('utf8').should.equal('hello world');

                  Test.findOne({ block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') }, function (err, rb) {
                    should.strictEqual(err, null);
                    rb.block.toString('utf8').should.equal('hello world');

                    Test.remove({}, function (err) {
                      db.close();
                      should.strictEqual(err, null);
                    });
                  });
                });
              });
            });
          });
        });
      });

    });
  },

  'buffer tests using conditionals': function () {
    // $in $nin etc
    var db = start()
      , BufSchema = new Schema({ name: String, block: Buffer })
      , Test = db.model('Buffer2', BufSchema, "buffer_"+random());

    var docA = { name: 'A', block: new MongooseBuffer([195, 188, 98, 101, 114]) }; //über
    var docB = { name: 'B', block: new MongooseBuffer("buffer shtuffs are neat") };
    var docC = { name: 'C', block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') };

    Test.create(docA, docB, docC, function (err, a, b, c) {
      should.strictEqual(err, null);
      a.block.toString('utf8').should.equal('über');
      b.block.toString('utf8').should.equal('buffer shtuffs are neat');
      c.block.toString('utf8').should.equal('hello world');

      Test.find({ block: { $in: [[195, 188, 98, 101, 114], "buffer shtuffs are neat", new Buffer('aGVsbG8gd29ybGQ=', 'base64')] }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(3);
      });

      Test.find({ block: { $in: ['über', 'hello world'] }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(2);
      });

      Test.find({ block: { $in: ['über'] }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(1);
        tests[0].block.toString('utf8').should.equal('über');
      });

      Test.find({ block: { $nin: ['über'] }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(2);
      });

      Test.find({ block: { $nin: [[195, 188, 98, 101, 114], new Buffer('aGVsbG8gd29ybGQ=', 'base64')] }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(1);
        tests[0].block.toString('utf8').should.equal('buffer shtuffs are neat');
      });

      Test.find({ block: { $ne: 'über' }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(2);
      });

      Test.find({ block: { $gt: 'über' }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(2);
      });

      Test.find({ block: { $gte: 'über' }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(3);
      });

      Test.find({ block: { $lt: new Buffer('buffer shtuffs are neat') }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(2);
        tests[0].block.toString('utf8').should.equal('über');
      });

      Test.find({ block: { $lte: 'buffer shtuffs are neat' }}, function (err, tests) {
        done();
        should.strictEqual(err, null);
        tests.length.should.equal(3);
      });

      var pending = 9;
      function done () {
        if (--pending) return;
        Test.remove({}, function (err) {
          db.close();
          should.strictEqual(err, null);
        });
      }
    });
  },

  // gh-591
  'querying Mixed types with elemMatch': function () {
    var db = start()
      , S = new Schema({ a: [{}], b: Number })
      , M = db.model('QueryingMixedArrays', S, random())

    var m = new M;
    m.a = [1,2,{ name: 'Frodo' },'IDK', {name: 100}];
    m.b = 10;

    m.save(function (err) {
      should.strictEqual(null, err);

      M.find({ a: { name: 'Frodo' }, b: '10' }, function (err, docs) {
        should.strictEqual(null, err);
        docs[0].a.length.should.equal(5);
        docs[0].b.valueOf().should.equal(10);

        var query = {
            a: {
                $elemMatch: { name: 100 }
            }
        }

        M.find(query, function (err, docs) {
          db.close();
          should.strictEqual(null, err);
          docs[0].a.length.should.equal(5);
        });
      });
    });
  },

  // gh-599
  'regex with Array should work': function () {
    var db = start()
      , B = db.model('BlogPostB', random())

    B.create({ tags: 'wooof baaaark meeeeow'.split(' ') }, function (err, b) {
      should.strictEqual(null, err);
      B.findOne({ tags: /ooof$/ }, function (err, doc) {
        should.strictEqual(null, err);
        should.strictEqual(true, !! doc);
        ;(!! ~doc.tags.indexOf('meeeeow')).should.be.true;

        B.findOne({ tags: {$regex: 'eow$' } }, function (err, doc) {
          db.close();
          should.strictEqual(null, err);
          should.strictEqual(true, !! doc);
          ;(!! ~doc.tags.indexOf('meeeeow')).should.be.true;
        });
      });
    });
  },

  // gh-640
  'updating a number to null': function () {
    var db = start()
    var B = db.model('BlogPostB')
    var b = new B({ meta: { visitors: null }});
    b.save(function (err) {
      should.strictEqual(null, err);
      B.findById(b, function (err, b) {
        should.strictEqual(null, err);
        should.strictEqual(b.meta.visitors, null);

        B.update({ _id: b._id }, { meta: { visitors: null }}, function (err, docs) {
          db.close();
          should.strictEqual(null, err);
        });
      });
    });
  }
};
