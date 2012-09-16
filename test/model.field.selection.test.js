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

var modelName = 'model.select.blogpost';
mongoose.model(modelName, BlogPostB);
var collection = 'blogposts_' + random();

describe('model field selection', function(){
  it('excluded fields should be undefined', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection)
      , date = new Date

    var doc = {
        title: 'subset 1'
      , author: 'me'
      , comments: [{ title: 'first comment', date: new Date }, { title: '2nd', date: new Date }]
      , meta: { date: date }
    };

    BlogPostB.create(doc, function (err, created) {
      assert.ifError(err);

      var id = created.id;
      BlogPostB.findById(id, {title: 0, 'meta.date': 0, owners: 0, 'comments.user': 0}, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.equal(found._id.toString(), created._id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual('me', found.author);
        assert.strictEqual(true, Array.isArray(found.numbers));
        assert.equal(undefined, found.meta.date);
        assert.equal(found.numbers.length, 0);
        assert.equal(undefined, found.owners);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(found.comments.length, 2);
        found.comments.forEach(function (comment) {
          assert.equal(undefined, comment.user);
        })
        done();
      });
    });
  });

  it('excluded fields should be undefined and defaults applied to other fields', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection)
      , id = new DocumentObjectId
      , date = new Date

    BlogPostB.collection.insert({ _id: id, title: 'hahaha1', meta: { date: date }}, function (err) {
      assert.ifError(err);

      BlogPostB.findById(id, {title: 0}, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.equal(found._id.toString(), id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual(undefined, found.author);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(date.toString(), found.meta.date.toString());
        assert.equal(found.comments.length, 0);
        done();
      });
    });
  });

  it('where subset of fields excludes _id', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection);
    BlogPostB.create({title: 'subset 1'}, function (err, created) {
      assert.ifError(err);
      BlogPostB.findOne({title: 'subset 1'}, {title: 1, _id: 0}, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.strictEqual(undefined, found._id);
        assert.equal(found.title,'subset 1');
        done();
      });
    });
  })

  it('works with subset of fields, excluding _id', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection);
    BlogPostB.create({title: 'subset 1', author: 'me'}, function (err, created) {
      assert.ifError(err);
      BlogPostB.find({title: 'subset 1'}, {title: 1, _id: 0}, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.strictEqual(undefined, found[0]._id);
        assert.equal(found[0].title,'subset 1');
        assert.strictEqual(undefined, found[0].def);
        assert.strictEqual(undefined, found[0].author);
        assert.strictEqual(false, Array.isArray(found[0].comments));
        done();
      });
    });
  })

  it('works with subset of fields excluding emebedded doc _id (gh-541)', function(done){ 
    var db = start()
      , BlogPostB = db.model(modelName, collection);

    BlogPostB.create({title: 'LOTR', comments: [{ title: ':)' }]}, function (err, created) {
      assert.ifError(err);
      BlogPostB.find({_id: created}, { _id: 0, 'comments._id': 0 }, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.strictEqual(undefined, found[0]._id);
        assert.equal(found[0].title,'LOTR');
        assert.strictEqual('kandinsky', found[0].def);
        assert.strictEqual(undefined, found[0].author);
        assert.strictEqual(true, Array.isArray(found[0].comments));
        assert.equal(found[0].comments.length,1);
        assert.equal(found[0].comments[0].title, ':)');
        assert.strictEqual(undefined, found[0].comments[0]._id);
        // gh-590
        assert.strictEqual(null, found[0].comments[0].id);
        done();
      });
    });
  })

  it('included fields should have defaults applied when no value exists in db (gh-870)', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection)
      , id = new DocumentObjectId

    BlogPostB.collection.insert(
        { _id: id, title: 'issue 870'}, { safe: true }, function (err) {
      assert.ifError(err);

      BlogPostB.findById(id, 'def comments', function (err, found) {
        db.close();
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found._id.toString(), id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual(undefined, found.author);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(0, found.comments.length);
        done();
      });
    });
  });

  it('including subdoc field excludes other subdoc fields (gh-1027)', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection)

    BlogPostB.create({ comments: [{title: 'a'}, {title:'b'}] }, function (err, doc) {
      assert.ifError(err);

      BlogPostB.findById(doc._id).select('_id comments.title').exec(function (err, found) {
        db.close();
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found._id.toString(), doc._id.toString());
        assert.strictEqual(undefined, found.title);
        assert.strictEqual(true, Array.isArray(found.comments));
        found.comments.forEach(function (comment) {
          assert.equal(undefined, comment.body);
          assert.equal(undefined, comment.comments);
          assert.equal(undefined, comment._id);
          assert.ok(!!comment.title);
        });
        done();
      });
    });
  });

  it('excluding nested subdoc fields (gh-1027)', function(done){
    var db = start()
      , BlogPostB = db.model(modelName, collection)

    BlogPostB.create({ title: 'top', comments: [{title: 'a',body:'body'}, {title:'b', body:'body',comments: [{title:'c'}]}] }, function (err, doc) {
      assert.ifError(err);

      BlogPostB.findById(doc._id).select('-_id -comments.title -comments.comments.comments -numbers').exec(function (err, found) {
        db.close();
        assert.ifError(err);
        assert.ok(found);
        assert.equal(undefined, found._id);
        assert.strictEqual('top', found.title);
        assert.equal(undefined, found.numbers);
        assert.strictEqual(true, Array.isArray(found.comments));
        found.comments.forEach(function (comment) {
          assert.equal(undefined, comment.title);
          assert.equal('body', comment.body);
          assert.strictEqual(true, Array.isArray(comment.comments));
          assert.ok(comment._id);
          comment.comments.forEach(function (comment) {
            assert.equal('c', comment.title);
            assert.equal(undefined, comment.body);
            assert.equal(undefined, comment.comments);
            assert.ok(comment._id);
          });
        });
        done();
      });
    });
  });

  it('casts elemMatch args (gh-1091)', function(done){
    // mongodb 2.2 support
    var db = start()

    var postSchema = new Schema({
       ids: [{type: Schema.ObjectId}]
    });

    var B = db.model('gh-1091', postSchema);
    var _id1 = new mongoose.Types.ObjectId;
    var _id2 = new mongoose.Types.ObjectId;

    //mongoose.set('debug', true);
    B.create({ ids: [_id1, _id2] }, function (err, doc) {
      assert.ifError(err);

      B
      .findById(doc._id)
      .select({ ids: { $elemMatch: { $in: [_id2.toString()] }}})
      .exec(function (err, found) {
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found.id, doc.id);
        assert.equal(1, found.ids.length);
        assert.equal(_id2.toString(), found.ids[0].toString());

        B
        .find({ _id: doc._id })
        .select({ ids: { $elemMatch: { $in: [_id2.toString()] }}})
        .exec(function (err, found) {
          assert.ifError(err);
          assert.ok(found.length);
          found = found[0];
          assert.equal(found.id, doc.id);
          assert.equal(1, found.ids.length);
          assert.equal(_id2.toString(), found.ids[0].toString());
          done();
        })
      })
    })
  })
})
