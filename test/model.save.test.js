/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , DocumentObjectId = mongoose.Types.ObjectId

/**
 * Setup
 */

var schema = Schema({
  title: String
})


describe('model', function () {
  describe('save()', function () {
    var db;
    var B;
    var BP;
    var Comments = new Schema;

    Comments.add({
      title     : String
      , date      : Date
      , body      : String
      , comments  : [Comments]
    });

    var BlogPost = new Schema({
      title     : String
      , author    : String
      , slug      : String
      , date      : Date
      , meta      : {
        date        : Date
        , visitors  : Number
      }
      , published : Boolean
      , mixed     : {}
      , numbers   : [Number]
      , owners    : [DocumentObjectId]
      , comments  : [Comments]
      , nested    : { array: [Number] }
    });

    BlogPost
      .virtual('titleWithAuthor')
      .get(function () {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function (val) {
        var split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    BlogPost.method('cool', function(){
      return this;
    });

    BlogPost.static('woot', function(){
      return this;
    });


    before(function (done) {
      db = start();
      B = db.model('model-create', schema, 'model-create-' + random());
      BP = db.model('BlogPost', BlogPost);
      done();
    });

    after(function (done) {
      db.close(done);
    });


    it('handle exception in user callback gh-1662', function (done) {
      var schema = new mongoose.Schema({"name": String}, {"collection": "bugDemo", "capped": {"size": 2048, "max": 3}, "strict": false});
      var Bug = db.model('Bug', schema);

      var preException = 0, postException = 0, errSentinal = new Error("error from user callback");

      Bug.db.on('error', function(err) {
        assert.equal(1, preException, "Code run once before throwing");
        assert.equal(0, postException, "Code never run after throwing");
        assert.ok(err);
        assert.equal(err, err);
        done();
      });
      var b = Bug.create([{name: "MongoDb1"}, {name: "MongoDb2"}, {name: "MongoDb3"}], function (e, r) {
        if (e) return console.error(e);

        var stream = Bug.find().tailable().stream();

        return stream.on('data', function (doc) {
          preException++;
          throw errSentinal;
          postException++;
        });

      });
    });


    it('handles updates using mquery syntax gh-1682', function (done) {
      BP.create({
        comments: [
          {title: 'Comment 1', body: 'Body Comment 1'},
          {title: 'Comment 2', body: 'Body Comment 2'}
        ]
      }, function (err, obj) {
        assert.ifError(err);
        //If you switch these two lines it works.
//        obj.comments[1].title = 'Nope';
        obj.set('comments.1', {title: 'Nope'});
        obj.save(function (err, obj) {
          assert.ifError(err);
          assert.equal(obj.comments[1].title, 'Nope');
          done();
        })
      })
    });


  });
})
