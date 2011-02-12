
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Query = require('mongoose/query').Query
  , FindQuery = require('mongoose/query').FindQuery
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ObjectId = Schema.ObjectId
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
  , owners    : [ObjectId]
  , comments  : [Comments]
});

mongoose.model('BlogPostB', BlogPostB);

var collection = 'blogposts_' + random();

module.exports = {
  'test that find returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    
    // query
    BlogPostB.find({}).should.be.an.instanceof(Query);
//    BlogPostB.find({}).executed.should.be.false;

    // query, fields
    BlogPostB.find({}, {}).should.be.an.instanceof(Query);
//    BlogPostB.find({}, {}).executed.should.be.false;

    // query, fields (array)
    BlogPostB.find({}, []).should.be.an.instanceof(Query);
//    BlogPostB.find({}, []).executed.should.be.false;

    // query, fields, options
    BlogPostB.find({}, {}, {}).should.be.an.instanceof(Query);
//    BlogPostB.find({}, {}, {}).executed.should.be.false;

    // query, fields (array), options
    BlogPostB.find({}, [], {}).should.be.an.instanceof(Query);
//    BlogPostB.find({}, [], {}).executed.should.be.false;

    db.close();
  },

  'test that findOne returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    
    // query
    BlogPostB.findOne({}).should.be.an.instanceof(Query);
//    BlogPostB.findOne({}).executed.should.be.false;

    // query, fields
    BlogPostB.findOne({}, {}).should.be.an.instanceof(Query);
//    BlogPostB.findOne({}, {}).executed.should.be.false;

    // query, fields (array)
    BlogPostB.findOne({}, []).should.be.an.instanceof(Query);
//    BlogPostB.findOne({}, []).executed.should.be.false;

    // query, fields, options
    BlogPostB.findOne({}, {}, {}).should.be.an.instanceof(Query);
//    BlogPostB.findOne({}, {}, {}).executed.should.be.false;

    // query, fields (array), options
    BlogPostB.findOne({}, [], {}).should.be.an.instanceof(Query);
//    BlogPostB.findOne({}, [], {}).executed.should.be.false;

    db.close();
  },

  'test that a query is executed when a callback is passed': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
//      , count = 10
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      --count || db.close();
    };
    
    // query
    BlogPostB.find(q, fn).should.be.an.instanceof(Query);
//    BlogPostB.find(q, fn).executed.should.be.true;

    // query, fields
    BlogPostB.find(q, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.find(q, {}, fn).executed.should.be.true;

    // query, fields (array)
    BlogPostB.find(q, [], fn).should.be.an.instanceof(Query);
//    BlogPostB.find(q, [], fn).executed.should.be.true;

    // query, fields, options
    BlogPostB.find(q, {}, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.find(q, {}, {}, fn).executed.should.be.true;

    // query, fields (array), options
    BlogPostB.find(q, [], {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.find(q, [], {}, fn).executed.should.be.true;
  },

  'test that query is executed with a callback for findOne': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 5
//      , count = 10
      , q =  { _id: new DocumentObjectId }; // make sure the query is fast

    function fn () {
      --count || db.close();
    };
    
    // query
    BlogPostB.findOne(q, fn).should.be.an.instanceof(Query);
//    BlogPostB.findOne(q, fn).executed.should.be.true;

    // query, fields
    BlogPostB.findOne(q, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.findOne(q, {}, fn).executed.should.be.true;

    // query, fields (array)
    BlogPostB.findOne(q, [], fn).should.be.an.instanceof(Query);
//    BlogPostB.findOne(q, [], fn).executed.should.be.true;

    // query, fields, options
    BlogPostB.findOne(q, {}, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.findOne(q, {}, {}, fn).executed.should.be.true;

    // query, fields (array), options
    BlogPostB.findOne(q, [], {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.findOne(q, [], {}, fn).executed.should.be.true;
  },

  'test that count returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.count({}).should.be.an.instanceof(Query);
//    BlogPostB.count({}).executed.should.be.false;

    db.close();
  },

  'test that count Query executes when you pass a callback': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 1;
//      , count = 2;

    function fn () {
      --count || db.close();
    };

    BlogPostB.count({}, fn).should.be.an.instanceof(Query);
//    BlogPostB.count({}, fn).executed.should.be.true;
  },

  'test that update returns a Query': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.update({}, {}).should.be.an.instanceof(Query);
//    BlogPostB.update({}, {}).executed.should.be.false;

    BlogPostB.update({}, {}, {}).should.be.an.instanceof(Query);
//    BlogPostB.update({}, {}, {}).executed.should.be.false;

    db.close();
  },

  'test that update Query executes when you pass a callback': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , count = 2;
//      , count = 4;

    function fn () {
      --count || db.close();
    };

    BlogPostB.update({title: random()}, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.update({title: random()}, {}, fn).executed.should.be.true;

    BlogPostB.update({title: random()}, {}, {}, fn).should.be.an.instanceof(Query);
//    BlogPostB.update({title: random()}, {}, {}, fn).executed.should.be.true;
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

      BlogPostB.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        doc.should.be.an.instanceof(BlogPostB);
        doc.get('title').should.eql(title);

        db.close();
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

  'test finding documents with an array that contains one specific member': function () {
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
  'test find queries with $in cast the values within the array': function () {
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
  'test find queries with $nin cast the values within the array': function () {
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

  'test for findById with partial initialization': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , queries = 5;

    var post = new BlogPostB();

    post.title = 'hahaha';
    post.slug = 'woot';

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findById(post.get('_id'), function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.true;
        doc.isInit('date').should.be.true;
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), ['title', 'slug'], function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.true;
        doc.isInit('date').should.be.false;
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), { slug: 0 }, function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.false;
        doc.isInit('date').should.be.true;
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), ['title'], function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.true;
        doc.isInit('slug').should.be.false;
        doc.isInit('date').should.be.false;
        --queries || db.close();
      });

      BlogPostB.findById(post.get('_id'), ['slug'], function (err, doc) {
        should.strictEqual(err, null);
        doc.isInit('title').should.be.false;
        doc.isInit('slug').should.be.true;
        doc.isInit('date').should.be.false;
        --queries || db.close();
      });
    });
  },

  'test find with subset of fields, excluding _id': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);
    BlogPostB.create({title: 'subset 1'}, function (err, created) {
      should.strictEqual(err, null);
      BlogPostB.findOne({title: 'subset 1'}, {title: 1, _id: 0}, function (err, found) {
        should.strictEqual(err, null);
        found._id.should.be.null;
        found.title.should.equal('subset 1');
        db.close();
      });
    });
  },

  'test for find with partial initialization': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection)
      , queries = 5;

    var post = new BlogPostB();

    post.title = 'hahaha';
    post.slug = 'woot';

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.find({ _id: post.get('_id') }, function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.true;
        docs[0].isInit('date').should.be.true;
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, ['title', 'slug'], function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.true;
        docs[0].isInit('date').should.be.false;
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, { slug: 0 }, function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.false;
        docs[0].isInit('date').should.be.true;
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, ['title'], function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.true;
        docs[0].isInit('slug').should.be.false;
        docs[0].isInit('date').should.be.false;
        --queries || db.close();
      });

      BlogPostB.find({ _id: post.get('_id') }, ['slug'], function (err, docs) {
        should.strictEqual(err, null);
        docs[0].isInit('title').should.be.false;
        docs[0].isInit('slug').should.be.true;
        docs[0].isInit('date').should.be.false;
        --queries || db.close();
      });
    });
  },

  // GH-204
  'test query casting when finding by Date': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    var post = new BlogPostB();

    post.meta.date = new Date();

    post.save(function (err) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ _id: post._id, 'meta.date': { $lte: Date.now() } },
      function (err, doc) {
        should.strictEqual(err, null);

        DocumentObjectId.toString(doc._id).should.eql(DocumentObjectId.toString(post._id));
        db.close();
      });
    });
  },

  // GH-220
  'test querying if an array contains at least a certain single member': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

      var post = new BlogPostB();

      post.tags.push('cat');

      post.save( function (err) {
        should.strictEqual(err, null);

        BlogPostB.findOne({tags: 'cat'}, function (err, doc) {
          should.strictEqual(err, null);

          doc._id.should.eql(post._id);
          db.close();
        });
      });
  },

  'test querying via $which with a string': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({ title: 'Steve Jobs', author: 'Steve Jobs'}, function (err, created) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ $where: "this.title !== null && this.title === this.author" }, function (err, found) {
        should.strictEqual(err, null);

        found._id.should.eql(created._id);
        db.close();
      });
    });
  },

  'test querying via $which with a function': function () {
    var db = start()
      , BlogPostB = db.model('BlogPostB', collection);

    BlogPostB.create({ author: 'Atari', slug: 'Atari'}, function (err, created) {
      should.strictEqual(err, null);

      BlogPostB.findOne({ $where: function () {
        return (this.author !== null) && (this.slug !== null) && (this.author === this.slug);
      } }, function (err, found) {
        should.strictEqual(err, null);

        found._id.should.eql(created._id);
        db.close();
      });
    });
  },

  // TODO Won't pass until we fix materialization/raw data assymetry
  'test find with $exists': function () {
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

  // GH-242
  'test finding based on embedded document fields': function () {
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
        found.get('_id').should.eql(post.get('_id'));
        db.close();
      });
    });
  }
};
