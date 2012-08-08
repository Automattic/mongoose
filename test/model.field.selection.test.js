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

    BlogPostB.create({title: 'subset 1', author: 'me', meta: { date: date }}, function (err, created) {
      assert.ifError(err);
      var id = created.id;
      BlogPostB.findById(created.id, {title: 0, 'meta.date': 0, owners: 0}, function (err, found) {
        db.close();
        assert.ifError(err);
        assert.equal(found._id.toString(), created._id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual('me', found.author);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(undefined, found.meta.date);
        assert.equal(found.comments.length, 0);
        assert.equal(undefined, found.owners);
        done();
      });
    });
  })

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
        { _id: id, title: 'issue 870'}, function (err) {
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

})
