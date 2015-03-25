
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Document = require('../lib/document')
  , EmbeddedDocument = require('../lib/types/embedded')
  , DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test Document constructor.
 */

function TestDocument () {
  Document.apply(this, arguments);
};

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

var em = new Schema({ title: String, body: String });
em.virtual('works').get(function () {
  return 'em virtual works'
});
var schema = new Schema({
    test    : String
  , oids    : [ObjectId]
  , numbers : [Number]
  , nested  : {
        age   : Number
      , cool  : ObjectId
      , deep  : { x: String }
      , path  : String
      , setr  : String
    }
  , nested2 : {
        nested: String
      , yup   : {
            nested  : Boolean
          , yup     : String
          , age     : Number
        }
    }
  , em: [em]
});
TestDocument.prototype.$__setSchema(schema);

schema.virtual('nested.agePlus2').get(function (v) {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function (v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function (v) {
  return this.nested.age + (v ? v : '');
});
schema.path('nested.setr').set(function (v) {
  return v + ' setter';
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn){
  fn(null, arguments);
};

describe('document: hooks:', function () {
  it('step order', function(done){
    var doc = new TestDocument()
      , steps = 0
      , awaiting = 0
      , called = false;

    // serial
    doc.pre('hooksTest', function(next){
      steps++;
      setTimeout(function(){
        // make sure next step hasn't executed yet
        assert.equal(1, steps);
        next();
      }, 50);
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    // parallel
    doc.pre('hooksTest', true, function(next, done){
      steps++;
      assert.equal(3, steps);
      setTimeout(function(){
        assert.equal(4, steps);
      }, 10);
      setTimeout(function(){
        steps++;
        done();
      }, 110);
      next();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      setTimeout(function(){
        assert.equal(4, steps);
      }, 10);
      setTimeout(function(){
        steps++;
        done();
      }, 110);
      next();
    });

    doc.hooksTest(function(err){
      assert.ifError(err);
      assert.equal(6, steps);
      done();
    });

  });

  it('calling next twice does not break', function(done){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next){
      steps++;
      next();
      next();
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    doc.hooksTest(function(err){
      assert.ifError(err);
      assert.equal(2, steps);
      done();
    });
  });

  it('calling done twice does not break', function(done){
    var doc = new TestDocument()
      , steps = 0

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.hooksTest(function(err){
      assert.ifError(err);
      assert.equal(2, steps);
      done();
    });
  });

  it('errors from a serial hook', function(done){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next(new Error);
    });

    doc.pre('hooksTest', function(next){
      steps++;
    });

    doc.hooksTest(function(err){
      assert.ok(err instanceof Error);
      assert.equal(2, steps);
      done();
    });
  });

  it('errors from last serial hook', function(done){
    var doc = new TestDocument()
      , called = false;

    doc.pre('hooksTest', function(next){
      next(new Error);
    });

    doc.hooksTest(function(err){
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('mutating incoming args via middleware', function(done){
    var doc = new TestDocument();

    doc.pre('set', function(next, path, val){
      next(path, 'altered-' + val);
    });

    doc.set('test', 'me');
    assert.equal('altered-me', doc.test);
    done();
  });

  it('test hooks system errors from a parallel hook', function(done){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done(new Error);
    });

    doc.hooksTest(function(err){
      assert.ok(err instanceof Error);
      assert.equal(3, steps);
      done();
    });
  });

  it('passing two arguments to a method subject to hooks and return value', function(done){
    var doc = new TestDocument()
      , called = false;

    doc.pre('hooksTest', function (next) {
      next();
    });

    doc.hooksTest(function (err, args) {
      assert.equal(2, args.length);
      assert.equal(args[1], 'test');
      done();
    }, 'test')
  });

  it('hooking set works with document arrays (gh-746)', function(done){
    var db = start();

    var child = new Schema({ text: String });

    child.pre('set', function (next, path, value, type) {
      next(path, value, type);
    });

    var schema = new Schema({
        name: String
      , e: [child]
    });

    var S = db.model('docArrayWithHookedSet', schema);

    var s = new S({ name: "test" });
    s.e = [{ text: 'hi' }];
    s.save(function (err) {
      assert.ifError(err);

      S.findById(s.id, function (err ,s) {
        assert.ifError(err);

        s.e = [{ text: 'bye' }];
        s.save(function (err) {
          assert.ifError(err);

          S.findById(s.id, function (err, s) {
            db.close();
            assert.ifError(err);
            assert.equal('bye', s.e[0].text);
            done();
          })
        })
      })
    });
  });

  it('pre save hooks on sub-docs should not exec after validation errors', function(done){
    var db = start();
    var presave = false;

    var child = new Schema({ text: { type: String, required: true }});

    child.pre('save', function (next) {
      presave = true;
      next();
    });

    var schema = new Schema({
        name: String
      , e: [child]
    });

    var S = db.model('docArrayWithHookedSave', schema);
    var s = new S({ name: 'hi', e: [{}] });
    s.save(function (err) {
      assert.ok(err);
      assert.ok(err.errors['e.0.text']);
      assert.equal(false, presave);
      db.close(done);
    });
  });

  it('post remove hooks on subdocuments work', function(done) {
    var db = start();
    var sub = Schema({ _id: Number });
    var called = { pre: 0, post: 0 };

    sub.pre('remove', function (next) {
      called.pre++;
      next();
    });

    sub.post('remove', function (doc) {
      called.post++;
      assert.ok(doc instanceof Document);
    });

    var par = Schema({ sub: [sub], name: String });
    var M = db.model('post-remove-hooks-sub', par);

    var m = new M({ sub: [{ _id: 1 }, { _id: 2 }] });
    m.save(function (err) {
      assert.ifError(err);
      assert.equal(0, called.pre);
      assert.equal(0, called.post);

      M.findById(m, function(err, doc) {
        assert.ifError(err);

        doc.sub.id(1).remove();
        doc.save(function (err) {
          assert.ifError(err);
          assert.equal(1, called.pre);
          assert.equal(1, called.post);

          // does not get called when not removed
          doc.name = 'changed1';
          doc.save(function (err) {
            assert.ifError(err);
            assert.equal(1, called.pre);
            assert.equal(1, called.post);

            doc.sub.id(2).remove();
            doc.remove(function (err) {
              assert.ifError(err);
              assert.equal(2, called.pre);
              assert.equal(2, called.post);

              // does not get called twice
              doc.remove(function (err) {
                assert.ifError(err);
                assert.equal(2, called.pre);
                assert.equal(2, called.post);
                db.close(done);
              });
            });
          });
        });
      });
    });
  });

  it('can set nested schema to undefined in pre save (gh-1335)', function(done) {
    var db = start();
    var FooSchema = new Schema({});
    var Foo = db.model('gh-1335-1', FooSchema);
    var BarSchema = new Schema({
      foos: [FooSchema]
    });
    var Bar = db.model('gh-1335-2', BarSchema);

    var b = new Bar();
    b.pre('save', function(next) {
      if (this.isNew && 0 === this.foos.length) {
        this.foos = undefined;
      }
      next();
    });

    b.save(function(error, dbBar) {
      assert.ifError(error);
      assert.ok(!dbBar.foos);
      assert.equal(typeof dbBar.foos, 'undefined');
      assert.ok(!b.foos);
      assert.equal(typeof b.foos, 'undefined');
      db.close(done);
    });
  });

  it('post save hooks on subdocuments work (gh-915)', function(done) {

    var doneCalled = false;
    var _done = function(e) {
      if (!doneCalled) {
        doneCalled = true;
        done(e);
      }
    };
    var db = start();
    var called = { post: 0 };

    var subSchema = new Schema({
      name: String
    });

    subSchema.post('save', function(doc) {
      called.post++;
      try {
        assert.ok(doc instanceof EmbeddedDocument);
      }
      catch (e) {
        _done(e);
      }
    });

    var postSaveHooks = new Schema({
      subs: [subSchema]
    });

    var M = db.model('post-save-hooks-sub', postSaveHooks);

    var m = new M({ subs: [
      { name: 'mee' },
      { name: 'moo' }
    ] });

    m.save(function(err) {
      assert.ifError(err);
      assert.equal(2, called.post);
      called.post = 0;

      M.findById(m, function(err, doc) {
        assert.ifError(err);
        doc.subs.push({ name: 'maa' });
        doc.save(function(err) {
          assert.ifError(err);
          assert.equal(3, called.post);

          _done();
        });
      });
    });
  });

  it("pre save hooks should run in parallel", function (done) {
    // we set the time out to be double that of the validator - 1 (so that running in serial will be greater then that)
    this.timeout(1000);
    var db = start(),
      count = 0

    var SchemaWithPreSaveHook = new Schema ({
      preference: String
    });
    SchemaWithPreSaveHook.pre('save', true, function hook (next, done) {
      setTimeout(function () {
        count++;
        next();
        if (count == 3) {
          done(new Error("gaga"));
        } else {
          done();
        }
      }, 500);
    });

    var MWPSH = db.model('mwpsh', new Schema({subs: [SchemaWithPreSaveHook]}));
    var m = new MWPSH({
      subs: [
        {
          preference: "xx"
        }
        ,
        {
          preference: "yy"
        }
        ,
        {
          preference: "1"
        }
        ,
        {
          preference: "2"
        }
      ]
    });

    m.save(function (err) {
      assert.equal(err.message, "gaga");
      assert.equal(count, 4);
      db.close(done);
    });
  });

  it('parallel followed by serial (gh-2521)', function(done) {
    var schema = Schema({ name: String });

    schema.pre('save', true, function(next, done) {
      process.nextTick(function() {
        done();
      });
      next();
    });

    schema.pre('save', function(done) {
      process.nextTick(function() {
        done();
      });
    });

    var db = start();
    var People = db.model('gh-2521', schema, 'gh-2521');

    var p = new People({ name: 'Val' });
    p.save(function(error) {
      assert.ifError(error);
      db.close(done);
    });
  });
});
