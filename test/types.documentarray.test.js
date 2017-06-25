/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = require('./common').mongoose,
    random = require('../lib/utils').random,
    setValue = require('../lib/utils').setValue,
    MongooseDocumentArray = mongoose.Types.DocumentArray,
    EmbeddedDocument = require('../lib/types/embedded'),
    DocumentArray = require('../lib/types/documentarray'),
    Schema = mongoose.Schema,
    assert = require('power-assert'),
    collection = 'types.documentarray_' + random();

/**
 * Setup.
 */

function TestDoc(schema) {
  var Subdocument = function() {
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
    title: {type: String}
  });

  Subdocument.prototype.$__setSchema(schema || SubSchema);

  return Subdocument;
}

/**
 * Test.
 */

describe('types.documentarray', function() {
  it('behaves and quacks like an array', function(done) {
    var a = new MongooseDocumentArray();

    assert.ok(a instanceof Array);
    assert.ok(a.isMongooseArray);
    assert.ok(a.isMongooseDocumentArray);
    assert.ok(Array.isArray(a));

    assert.deepEqual(a._atomics.constructor, Object);

    done();
  });

  it('#id', function(done) {
    var Subdocument = TestDoc();

    var sub1 = new Subdocument();
    sub1.title = 'Hello again to all my friends';
    var id = sub1.id;

    var a = new MongooseDocumentArray([sub1]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');
    assert.equal(a.id(sub1._id).title, 'Hello again to all my friends');

    // test with custom string _id
    var Custom = new Schema({
      title: {type: String},
      _id: {type: String, required: true}
    });

    Subdocument = TestDoc(Custom);

    var sub2 = new Subdocument();
    sub2.title = 'together we can play some rock-n-roll';
    sub2._id = 'a25';
    var id2 = sub2.id;

    a = new MongooseDocumentArray([sub2]);
    assert.equal(a.id(id2).title, 'together we can play some rock-n-roll');
    assert.equal(a.id(sub2._id).title, 'together we can play some rock-n-roll');

    // test with custom number _id
    var CustNumber = new Schema({
      title: {type: String},
      _id: {type: Number, required: true}
    });

    Subdocument = TestDoc(CustNumber);

    var sub3 = new Subdocument();
    sub3.title = 'rock-n-roll';
    sub3._id = 1995;
    var id3 = sub3.id;

    a = new MongooseDocumentArray([sub3]);
    assert.equal(a.id(id3).title, 'rock-n-roll');
    assert.equal(a.id(sub3._id).title, 'rock-n-roll');

    // test with object as _id
    Custom = new Schema({
      title: {type: String},
      _id: {one: {type: String}, two: {type: String}}
    });

    Subdocument = TestDoc(Custom);

    sub1 = new Subdocument();
    sub1._id = {one: 'rolling', two: 'rock'};
    sub1.title = 'to be a rock and not to roll';

    sub2 = new Subdocument();
    sub2._id = {one: 'rock', two: 'roll'};
    sub2.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub1, sub2]);
    assert.notEqual(a.id({one: 'rolling', two: 'rock'}).title, 'rock-n-roll');
    assert.equal(a.id({one: 'rock', two: 'roll'}).title, 'rock-n-roll');

    // test with no _id
    var NoId = new Schema({
      title: {type: String}
    }, {noId: true});

    Subdocument = TestDoc(NoId);

    var sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub4]);
    var threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(threw, false);

    // test the _id option, noId is deprecated
    NoId = new Schema({
      title: {type: String}
    }, {_id: false});

    Subdocument = TestDoc(NoId);

    sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub4]);
    threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(threw, false);
    // undefined and null should not match a nonexistent _id
    assert.strictEqual(null, a.id(undefined));
    assert.strictEqual(null, a.id(null));

    // test when _id is a populated document
    Custom = new Schema({
      title: {type: String}
    });

    var Custom1 = new Schema({}, {id: false});

    Subdocument = TestDoc(Custom);
    var Subdocument1 = TestDoc(Custom1);

    var sub = new Subdocument1();
    sub1 = new Subdocument1();
    sub.title = 'Hello again to all my friends';
    id = sub1._id.toString();
    setValue('_id', sub1, sub);

    a = new MongooseDocumentArray([sub]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');

    done();
  });

  describe('inspect', function() {
    it('works with bad data', function(done) {
      var threw = false;
      var a = new MongooseDocumentArray([null]);
      try {
        a.inspect();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);
      done();
    });
  });

  describe('toObject', function() {
    it('works with bad data', function(done) {
      var threw = false;
      var a = new MongooseDocumentArray([null]);
      try {
        a.toObject();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);
      done();
    });
    it('passes options to its documents (gh-1415) (gh-4455)', function(done) {
      var subSchema = new Schema({
        title: {type: String}
      });

      subSchema.set('toObject', {
        transform: function(doc, ret) {
          // this should not be called because custom options are
          // passed during MongooseArray#toObject() calls
          ret.changed = 123;
          return ret;
        }
      });

      var db = mongoose.createConnection();
      var M = db.model('gh-1415', {docs: [subSchema]});
      var m = new M;
      m.docs.push({docs: [{title: 'hello'}]});
      var delta = m.$__delta()[1];
      assert.equal(delta.$pushAll.docs[0].changed, undefined);

      M = db.model('gh-1415-1', new Schema({docs: [subSchema]}, {
        usePushEach: true
      }));
      m = new M;
      m.docs.push({docs: [{title: 'hello'}]});
      delta = m.$__delta()[1];
      assert.equal(delta.$push.docs.$each[0].changed, undefined);

      done();
    });
    it('uses the correct transform (gh-1412)', function(done) {
      var db = start();
      var SecondSchema = new Schema({});

      SecondSchema.set('toObject', {
        transform: function second(doc, ret) {
          ret.secondToObject = true;
          return ret;
        }
      });

      var FirstSchema = new Schema({
        second: [SecondSchema]
      });

      FirstSchema.set('toObject', {
        transform: function first(doc, ret) {
          ret.firstToObject = true;
          return ret;
        }
      });

      var First = db.model('first', FirstSchema);
      var Second = db.model('second', SecondSchema);

      var first = new First({});

      first.second.push(new Second());
      first.second.push(new Second());
      var obj = first.toObject();

      assert.ok(obj.firstToObject);
      assert.ok(obj.second[0].secondToObject);
      assert.ok(obj.second[1].secondToObject);
      assert.ok(!obj.second[0].firstToObject);
      assert.ok(!obj.second[1].firstToObject);
      db.close(done);
    });
  });

  describe('create()', function() {
    it('works', function(done) {
      var a = new MongooseDocumentArray([]);
      assert.equal(typeof a.create, 'function');

      var schema = new Schema({docs: [new Schema({name: 'string'})]});
      var T = mongoose.model('embeddedDocument#create_test', schema, 'asdfasdfa' + random());
      var t = new T;
      assert.equal(typeof t.docs.create, 'function');
      var subdoc = t.docs.create({name: 100});
      assert.ok(subdoc._id);
      assert.equal(subdoc.name, '100');
      assert.ok(subdoc instanceof EmbeddedDocument);
      done();
    });
  });

  describe('push()', function() {
    it('does not re-cast instances of its embedded doc', function(done) {
      var db = start();

      var child = new Schema({name: String, date: Date});
      child.pre('save', function(next) {
        this.date = new Date;
        next();
      });
      var schema = new Schema({children: [child]});
      var M = db.model('embeddedDocArray-push-re-cast', schema, 'edarecast-' + random());
      var m = new M;
      m.save(function(err) {
        assert.ifError(err);
        M.findById(m._id, function(err, doc) {
          assert.ifError(err);
          var c = doc.children.create({name: 'first'});
          assert.equal(c.date, undefined);
          doc.children.push(c);
          assert.equal(c.date, undefined);
          doc.save(function(err) {
            assert.ifError(err);
            assert.ok(doc.children[doc.children.length - 1].date);
            assert.equal(c.date, doc.children[doc.children.length - 1].date);

            doc.children.push(c);
            doc.children.push(c);

            doc.save(function(err) {
              assert.ifError(err);
              M.findById(m._id, function(err, doc) {
                assert.ifError(err);
                assert.equal(doc.children.length, 3);
                doc.children.forEach(function(child) {
                  assert.equal(doc.children[0].id, child.id);
                });
                db.close(done);
              });
            });
          });
        });
      });
    });
    it('corrects #ownerDocument() if value was created with array.create() (gh-1385)', function(done) {
      var mg = new mongoose.Mongoose;
      var M = mg.model('1385', {docs: [{name: String}]});
      var m = new M;
      var doc = m.docs.create({name: 'test 1385'});
      assert.notEqual(String(doc.ownerDocument()._id), String(m._id));
      m.docs.push(doc);
      assert.equal(doc.ownerDocument()._id, String(m._id));
      done();
    });
  });

  it('#push should work on EmbeddedDocuments more than 2 levels deep', function(done) {
    var Comments = new Schema;
    Comments.add({
      title: String,
      comments: [Comments]
    });
    var BlogPost = new Schema({
      title: String,
      comments: [Comments]
    });

    var db = start(),
        Post = db.model('docarray-BlogPost', BlogPost, collection);

    var p = new Post({title: 'comment nesting'});
    var c1 = p.comments.create({title: 'c1'});
    var c2 = c1.comments.create({title: 'c2'});
    var c3 = c2.comments.create({title: 'c3'});

    p.comments.push(c1);
    c1.comments.push(c2);
    c2.comments.push(c3);

    p.save(function(err) {
      assert.ifError(err);

      Post.findById(p._id, function(err, p) {
        assert.ifError(err);

        p.comments[0].comments[0].comments[0].comments.push({title: 'c4'});
        p.save(function(err) {
          assert.ifError(err);

          Post.findById(p._id, function(err, p) {
            assert.ifError(err);
            assert.equal(p.comments[0].comments[0].comments[0].comments[0].title, 'c4');
            db.close(done);
          });
        });
      });
    });
  });

  describe('invalidate()', function() {
    it('works', function(done) {
      var schema = new Schema({docs: [{name: 'string'}]});
      schema.pre('validate', function(next) {
        var subdoc = this.docs[this.docs.length - 1];
        subdoc.invalidate('name', 'boo boo', '%');
        next();
      });
      var T = mongoose.model('embeddedDocument#invalidate_test', schema, 'asdfasdfa' + random());
      var t = new T;
      t.docs.push({name: 100});

      var subdoc = t.docs.create({name: 'yep'});
      assert.throws(function() {
        // has no parent array
        subdoc.invalidate('name', 'junk', 47);
      });
      t.validate(function() {
        var e = t.errors['docs.0.name'];
        assert.ok(e);
        assert.equal(e.path, 'docs.0.name');
        assert.equal(e.kind, 'user defined');
        assert.equal(e.message, 'boo boo');
        assert.equal(e.value, '%');
        done();
      });
    });

    it('handles validation failures', function(done) {
      var db = start();
      var nested = new Schema({v: {type: Number, max: 30}});
      var schema = new Schema({
        docs: [nested]
      }, {collection: 'embedded-invalidate-' + random()});
      var M = db.model('embedded-invalidate', schema);
      var m = new M({docs: [{v: 900}]});
      m.save(function(err) {
        assert.equal(err.errors['docs.0.v'].value, 900);
        db.close(done);
      });
    });

    it('removes attached event listeners when creating new doc array', function(done) {
      var db = start();
      var nested = new Schema({v: {type: Number}});
      var schema = new Schema({
        docs: [nested]
      }, {collection: 'gh-2159'});
      var M = db.model('gh-2159', schema);
      M.create({docs: [{v: 900}]}, function(error, m) {
        m.shouldPrint = true;
        assert.ifError(error);
        var numListeners = m.listeners('save').length;
        assert.ok(numListeners > 0);
        m.docs = [{v: 9000}];
        m.save(function(error, m) {
          assert.ifError(error);
          assert.equal(numListeners, m.listeners('save').length);
          db.close(done);
        });
      });
    });
  });
});
