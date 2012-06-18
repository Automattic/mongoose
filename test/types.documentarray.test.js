
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = require('./common').mongoose
  , random = require('../lib/utils').random
  , MongooseArray = mongoose.Types.Array
  , MongooseDocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = require('../lib/types/embedded')
  , DocumentArray = require('../lib/types/documentarray')
  , Schema = mongoose.Schema
  , assert = require('assert')
  , collection = 'types.documentarray_' + random()

/**
 * Setup.
 */

function TestDoc (schema) {
  var Subdocument = function () {
    EmbeddedDocument.call(this, {}, new DocumentArray);
  };

  /**
   * Inherits from EmbeddedDocument.
   */

  Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

  /**
   * Set schema.
   */

  var SubSchema = new Schema({
      title: { type: String }
  });

  Subdocument.prototype.schema = schema || SubSchema;

  return Subdocument;
}

/**
 * Test.
 */

describe('types.documentarray', function(){
  it('behaves and quakcs like an array', function(){
    var a = new MongooseDocumentArray();

    assert.ok(a instanceof Array);
    assert.ok(a instanceof MongooseArray);
    assert.ok(a instanceof MongooseDocumentArray);
    assert.ok(Array.isArray(a));
    assert.equal('Object', a._atomics.constructor.name);
    assert.equal('object', typeof a);

    var b = new MongooseArray([1,2,3,4]);
    assert.equal('object', typeof b);
    assert.equal(Object.keys(b.toObject()).length,4);
  });

  it('#id', function(){
    var Subdocument = TestDoc();

    var sub1 = new Subdocument();
    sub1.title = 'Hello again to all my friends';
    var id = sub1.id;

    var a = new MongooseDocumentArray([sub1]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');
    assert.equal(a.id(sub1._id).title, 'Hello again to all my friends');

    // test with custom string _id
    var Custom = new Schema({
        title: { type: String }
      , _id:   { type: String, required: true }
    });

    var Subdocument = TestDoc(Custom);

    var sub2 = new Subdocument();
    sub2.title = 'together we can play some rock-n-roll';
    sub2._id = 'a25';
    var id2 = sub2.id;

    var a = new MongooseDocumentArray([sub2]);
    assert.equal(a.id(id2).title, 'together we can play some rock-n-roll');
    assert.equal(a.id(sub2._id).title, 'together we can play some rock-n-roll');

    // test with custom number _id
    var CustNumber = new Schema({
        title: { type: String }
      , _id:   { type: Number, required: true }
    });

    var Subdocument = TestDoc(CustNumber);

    var sub3 = new Subdocument();
    sub3.title = 'rock-n-roll';
    sub3._id = 1995;
    var id3 = sub3.id;

    var a = new MongooseDocumentArray([sub3]);
    assert.equal(a.id(id3).title, 'rock-n-roll');
    assert.equal(a.id(sub3._id).title, 'rock-n-roll');

    // test with no _id
    var NoId = new Schema({
        title: { type: String }
    }, { noId: true });

    var Subdocument = TestDoc(NoId);

    var sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    var a = new MongooseDocumentArray([sub4])
      , threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(false, threw);

  })

  describe('inspect', function(){
    it('works with bad data', function(){
      var threw = false;
      var a = new MongooseDocumentArray([null]);
      try {
        a.inspect();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);
    })
  })

  describe('toObject', function(){
    it('works with bad data', function(){
      var threw = false;
      var a = new MongooseDocumentArray([null]);
      try {
        a.toObject();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);
    })
  })

  it('#push should work on EmbeddedDocuments more than 2 levels deep', function (done) {
    var Comments = new Schema;
    Comments.add({
        title     : String
      , comments  : [Comments]
    });
    var BlogPost = new Schema({
        title     : String
      , comments  : [Comments]
    });

    var db = start()
      , Post = db.model('docarray-BlogPost', BlogPost, collection)
      , Comment = db.model('docarray-Comment', Comments, collection)

    var p =new Post({ title: "comment nesting" });
    var c1 =new Comment({ title: "c1" });
    var c2 = new Comment({ title: "c2" });
    var c3 = new Comment({ title: "c3" });

    p.comments.push(c1);
    c1.comments.push(c2);
    c2.comments.push(c3);

    p.save(function (err) {
      assert.ifError(err);

      Post.findById(p._id, function (err, p) {
        assert.ifError(err);

        var c4= new Comment({ title: "c4" });
        p.comments[0].comments[0].comments[0].comments.push(c4);
        p.save(function (err) {
          assert.ifError(err);

          Post.findById(p._id, function (err, p) {
            db.close();
            assert.ifError(err);
            assert.equal(p.comments[0].comments[0].comments[0].comments[0].title, 'c4');
            done();
          });
        });
      });
    })
  });

})
