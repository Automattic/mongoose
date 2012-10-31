
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
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

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

var BlogPost = new Schema({
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
  , owners    : [ObjectId]
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

var modelName = 'docuemnt.modified.blogpost'
mongoose.model(modelName, BlogPost);

var collection = 'blogposts_' + random();

describe('document modified', function(){
  describe('modified states', function(){
    it('reset after save', function(done){
      var db = start()
        , B = db.model(modelName, collection)
        , pending = 2;

      var b = new B;

      b.numbers.push(3);
      b.save(function (err) {
        assert.strictEqual(null, err);
        --pending || find();
      });

      b.numbers.push(3);
      b.save(function (err) {
        assert.strictEqual(null, err);
        --pending || find();
      });

      function find () {
        B.findById(b, function (err, b) {
          db.close();
          assert.strictEqual(null, err);
          assert.equal(2, b.numbers.length);
          done();
        });
      }
    });

    it('of embedded docs reset after save', function(done){
      var db = start()
        , BlogPost = db.model(modelName, collection);

      var post = new BlogPost({ title: 'hocus pocus' });
      post.comments.push({ title: 'Humpty Dumpty', comments: [{title: 'nested'}] });
      post.save(function(err){
        db.close();
        assert.strictEqual(null, err);
        var mFlag = post.comments[0].isModified('title');
        assert.equal(false, mFlag);
        assert.equal(false, post.isModified('title'));
        done();
      });
    })
  });

  describe('isModified', function(){
    it('should not throw with no argument', function(done){
      var db = start();
      var BlogPost = db.model(modelName, collection);
      var post = new BlogPost;
      db.close();

      var threw = false;
      try {
        post.isModified();
      } catch (err) {
        threw = true;
      }

      assert.equal(false, threw);
      done();
    });

    it('when modifying keys', function(done){
      var db = start()
        , BlogPost = db.model(modelName, collection);

      db.close();
      var post = new BlogPost;
      post.init({
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
      });

      assert.equal(false, post.isModified('title'));
      post.set('title', 'test');
      assert.equal(true, post.isModified('title'));

      assert.equal(false, post.isModified('date'));
      post.set('date', new Date(post.date + 10));
      assert.equal(true, post.isModified('date'));

      assert.equal(false, post.isModified('meta.date'));
      done();
    })

    it('setting a key identically to its current value should not dirty the key', function(done){
      var db = start()
        , BlogPost = db.model(modelName, collection);

      db.close();
      var post = new BlogPost;
      post.init({
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
      });

      assert.equal(false, post.isModified('title'));
      post.set('title', 'Test');
      assert.equal(false, post.isModified('title'));
      done();
    })

    describe('on DocumentArray', function(){
      it('work', function (done) {
        var db = start()
          , BlogPost = db.model(modelName, collection);

        db.close();
        var post = new BlogPost()
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
        });

        assert.equal(false, post.isModified('comments.0.title'));
        post.get('comments')[0].set('title', 'Woot');
        assert.equal(true, post.isModified('comments'));
        assert.equal(false, post.isDirectModified('comments'));
        assert.equal(true, post.isModified('comments.0.title'));
        assert.equal(true, post.isDirectModified('comments.0.title'));

        db.close();
        done();
      })
      it('with accessors', function(done){
        var db = start()
          , BlogPost = db.model(modelName, collection);

        var post = new BlogPost()
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
        });

        assert.equal(false, post.isModified('comments.0.body'));
        post.get('comments')[0].body = 'Woot';
        assert.equal(true, post.isModified('comments'));
        assert.equal(false, post.isDirectModified('comments'));
        assert.equal(true, post.isModified('comments.0.body'));
        assert.equal(true, post.isDirectModified('comments.0.body'));

        db.close();
        done();
      })
    })

    describe('on MongooseArray', function(){
      it('atomic methods', function(done){
        // COMPLETEME
        var db = start()
          , BlogPost = db.model(modelName, collection);

        db.close();
        var post = new BlogPost()
        assert.equal(false, post.isModified('owners'));
        post.get('owners').push(new DocumentObjectId);
        assert.equal(true, post.isModified('owners'));
        done();
      });
      it('native methods', function(done){
        // COMPLETEME
        var db = start()
          , BlogPost = db.model(modelName, collection);

        db.close();
        var post = new BlogPost;
        assert.equal(false, post.isModified('owners'));
        done();
      });
    });

    it('on entire document', function(done){
      var db = start()
        , BlogPost = db.model(modelName, collection)

      var doc = {
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
        , meta        : {
              date      : new Date
            , visitors  : 5
          }
        , published   : true
        , mixed       : { x: [ { y: [1,'yes', 2] } ] }
        , numbers     : []
        , owners      : [new DocumentObjectId, new DocumentObjectId]
        , comments    : [
            { title: 'Test', date: new Date, body: 'Test' }
          , { title: 'Super', date: new Date, body: 'Cool' }
          ]
      };

      BlogPost.create(doc, function (err, post) {
        assert.ifError(err);
        BlogPost.findById(post.id, function (err, postRead) {
          db.close();
          assert.ifError(err);
          //set the same data again back to the document.
          //expected result, nothing should be set to modified
          assert.equal(false, postRead.isModified('comments'));
          assert.equal(false, postRead.isNew);
          postRead.set(postRead.toObject());

          assert.equal(false, postRead.isModified('title'));
          assert.equal(false, postRead.isModified('slug'));
          assert.equal(false, postRead.isModified('date'));
          assert.equal(false, postRead.isModified('meta.date'));
          assert.equal(false, postRead.isModified('meta.visitors'));
          assert.equal(false, postRead.isModified('published'));
          assert.equal(false, postRead.isModified('mixed'));
          assert.equal(false, postRead.isModified('numbers'));
          assert.equal(false, postRead.isModified('owners'));
          assert.equal(false, postRead.isModified('comments'));
          var arr = postRead.comments.slice();
          arr[2] = postRead.comments.create({ title: 'index' });
          postRead.comments = arr;
          assert.equal(true, postRead.isModified('comments'));
          done();
        });
      });
    })
  });
})
