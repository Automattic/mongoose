/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    Document = require('../lib/document'),
    EmbeddedDocument = require('../lib/types/embedded');

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

var em = new Schema({title: String, body: String});
em.virtual('works').get(function() {
  return 'em virtual works';
});
var schema = new Schema({
  test: String,
  oids: [ObjectId],
  numbers: [Number],
  nested: {
    age: Number,
    cool: ObjectId,
    deep: {x: String},
    path: String,
    setr: String
  },
  nested2: {
    nested: String,
    yup: {
      nested: Boolean,
      yup: String,
      age: Number
    }
  },
  em: [em]
});
TestDocument.prototype.$__setSchema(schema);

schema.virtual('nested.agePlus2').get(function() {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function(v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function(v) {
  return this.nested.age + (v ? v : '');
});
schema.path('nested.setr').set(function(v) {
  return v + ' setter';
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn) {
  fn(null, arguments);
};

describe('document: hooks:', function() {
  it('step order', function(done) {
    var doc = new TestDocument(),
        steps = 0;

    // serial
    doc.$pre('hooksTest', function(next) {
      steps++;
      setTimeout(function() {
        // make sure next step hasn't executed yet
        assert.equal(steps, 1);
        next();
      }, 50);
    });

    doc.$pre('hooksTest', function(next) {
      steps++;
      next();
    });

    // parallel
    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      assert.equal(steps, 3);
      setTimeout(function() {
        assert.equal(steps, 4);
      }, 10);
      setTimeout(function() {
        steps++;
        done();
      }, 110);
      next();
    });

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      setTimeout(function() {
        assert.equal(steps, 4);
      }, 10);
      setTimeout(function() {
        steps++;
        done();
      }, 110);
      next();
    });

    doc.hooksTest(function(err) {
      assert.ifError(err);
      assert.equal(steps, 6);
      done();
    });
  });

  it('calling next twice does not break', function(done) {
    var doc = new TestDocument(),
        steps = 0;

    doc.$pre('hooksTest', function(next) {
      steps++;
      next();
      next();
    });

    doc.$pre('hooksTest', function(next) {
      steps++;
      next();
    });

    doc.hooksTest(function(err) {
      assert.ifError(err);
      assert.equal(steps, 2);
      done();
    });
  });

  it('calling done twice does not break', function(done) {
    var doc = new TestDocument(),
        steps = 0;

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      next();
      done();
      done();
    });

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      next();
      done();
      done();
    });

    doc.hooksTest(function(err) {
      assert.ifError(err);
      assert.equal(steps, 2);
      done();
    });
  });

  it('errors from a serial hook', function(done) {
    var doc = new TestDocument(),
        steps = 0;

    doc.$pre('hooksTest', function(next) {
      steps++;
      next();
    });

    doc.$pre('hooksTest', function(next) {
      steps++;
      next(new Error);
    });

    doc.$pre('hooksTest', function() {
      steps++;
    });

    doc.hooksTest(function(err) {
      assert.ok(err instanceof Error);
      assert.equal(steps, 2);
      done();
    });
  });

  it('errors from last serial hook', function(done) {
    var doc = new TestDocument();

    doc.$pre('hooksTest', function(next) {
      next(new Error);
    });

    doc.hooksTest(function(err) {
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('mutating incoming args via middleware', function(done) {
    var doc = new TestDocument();

    doc.$pre('set', function(next, path, val) {
      next(path, 'altered-' + val);
    });

    doc.set('test', 'me');
    assert.equal(doc.test, 'altered-me');
    done();
  });

  it('test hooks system errors from a parallel hook', function(done) {
    var doc = new TestDocument(),
        steps = 0;

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      next();
      done();
    });

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      next();
      done();
    });

    doc.$pre('hooksTest', true, function(next, done) {
      steps++;
      next();
      done(new Error);
    });

    doc.hooksTest(function(err) {
      assert.ok(err instanceof Error);
      assert.equal(steps, 3);
      done();
    });
  });

  it('passing two arguments to a method subject to hooks and return value', function(done) {
    var doc = new TestDocument();

    doc.$pre('hooksTest', function(next) {
      next();
    });

    doc.hooksTest(function(err, args) {
      assert.equal(args.length, 2);
      assert.equal(args[1], 'test');
      done();
    }, 'test');
  });

  it('hooking set works with document arrays (gh-746)', function(done) {
    var db = start();

    var child = new Schema({text: String});

    child.pre('set', function(next, path, value, type) {
      next(path, value, type);
    });

    var schema = new Schema({
      name: String,
      e: [child]
    });

    var S = db.model('docArrayWithHookedSet', schema);

    var s = new S({name: 'test'});
    s.e = [{text: 'hi'}];
    s.save(function(err) {
      assert.ifError(err);

      S.findById(s.id, function(err, s) {
        assert.ifError(err);

        s.e = [{text: 'bye'}];
        s.save(function(err) {
          assert.ifError(err);

          S.findById(s.id, function(err, s) {
            db.close();
            assert.ifError(err);
            assert.equal(s.e[0].text, 'bye');
            done();
          });
        });
      });
    });
  });

  it('pre save hooks on sub-docs should not exec after validation errors', function(done) {
    var db = start();
    var presave = false;

    var child = new Schema({text: {type: String, required: true}});

    child.pre('save', function(next) {
      presave = true;
      next();
    });

    var schema = new Schema({
      name: String,
      e: [child]
    });

    var S = db.model('docArrayWithHookedSave', schema);
    var s = new S({name: 'hi', e: [{}]});
    s.save(function(err) {
      db.close();

      try {
        assert.ok(err);
        assert.ok(err.errors['e.0.text']);
        assert.equal(presave, false);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('post remove hooks on subdocuments work', function(done) {
    var db = start();
    var sub = new Schema({_id: Number});
    var called = {pre: 0, post: 0};

    sub.pre('remove', function(next) {
      called.pre++;
      next();
    });

    sub.post('remove', function(doc) {
      called.post++;
      assert.ok(doc instanceof Document);
    });

    var par = new Schema({sub: [sub], name: String});
    var M = db.model('post-remove-hooks-sub', par);

    var m = new M({sub: [{_id: 1}, {_id: 2}]});
    m.save(function(err) {
      assert.ifError(err);
      assert.equal(called.pre, 0);
      assert.equal(called.post, 0);

      M.findById(m, function(err1, doc) {
        assert.ifError(err1);

        doc.sub.id(1).remove();
        doc.save(function(err2) {
          assert.ifError(err2);
          assert.equal(called.pre, 1);
          assert.equal(called.post, 1);

          // does not get called when not removed
          doc.name = 'changed1';
          doc.save(function(err3) {
            assert.ifError(err3);
            assert.equal(called.pre, 1);
            assert.equal(called.post, 1);

            doc.sub.id(2).remove();
            doc.remove(function(err4) {
              assert.ifError(err4);
              assert.equal(called.pre, 2);
              assert.equal(called.post, 2);

              // does not get called twice
              doc.remove(function(err5) {
                assert.ifError(err5);
                assert.equal(called.pre, 2);
                assert.equal(called.post, 2);
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
    db.model('gh-1335-1', FooSchema);
    var BarSchema = new Schema({
      foos: [FooSchema]
    });
    var Bar = db.model('gh-1335-2', BarSchema);

    var b = new Bar();
    b.$pre('save', function(next) {
      if (this.isNew && this.foos.length === 0) {
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

  it('post save hooks on subdocuments work (gh-915) (gh-3780)', function(done) {
    var doneCalled = false;
    var _done = function(e) {
      if (!doneCalled) {
        doneCalled = true;
        done(e);
      }
    };
    var db = start();
    var called = {post: 0};

    var subSchema = new Schema({
      name: String
    });

    subSchema.post('save', function(doc) {
      called.post++;
      try {
        assert.ok(doc instanceof EmbeddedDocument);
      } catch (e) {
        _done(e);
      }
    });

    var postSaveHooks = new Schema({
      subs: [subSchema]
    });

    var M = db.model('post-save-hooks-sub', postSaveHooks);

    var m = new M({
      subs: [
        {name: 'mee'},
        {name: 'moo'}
      ]
    });

    m.save(function(err) {
      assert.ifError(err);
      assert.equal(called.post, 2);
      called.post = 0;

      M.findById(m, function(err, doc) {
        assert.ifError(err);
        doc.subs.push({name: 'maa'});
        doc.save(function(err) {
          assert.ifError(err);
          assert.equal(called.post, 3);

          _done();
        });
      });
    });
  });

  it('pre save hooks should run in parallel', function(done) {
    // we set the time out to be double that of the validator - 1
    // (so that running in serial will be greater than that)
    this.timeout(1000);
    var db = start(),
        count = 0;

    var SchemaWithPreSaveHook = new Schema({
      preference: String
    });
    SchemaWithPreSaveHook.pre('save', true, function hook(next, done) {
      setTimeout(function() {
        count++;
        next();
        if (count === 3) {
          done(new Error('gaga'));
        } else {
          done();
        }
      }, 500);
    });

    var MWPSH = db.model('mwpsh', new Schema({subs: [SchemaWithPreSaveHook]}));
    var m = new MWPSH({
      subs: [{
        preference: 'xx'
      }, {
        preference: 'yy'
      }, {
        preference: '1'
      }, {
        preference: '2'
      }]
    });

    m.save(function(err) {
      db.close();

      try {
        assert.equal(err.message, 'gaga');
        assert.ok(count >= 3);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('parallel followed by serial (gh-2521)', function(done) {
    var schema = new Schema({name: String});

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

    var p = new People({name: 'Val'});
    p.save(function(error) {
      assert.ifError(error);
      db.close(done);
    });
  });

  it('runs post hooks after function (gh-2949)', function(done) {
    var schema = new Schema({name: String});

    var postCount = 0;
    schema.post('init', function(doc) {
      assert.equal(doc.name, 'Val');
      ++postCount;
    });

    var db = start();
    var People = db.model('gh-2949', schema, 'gh-2949');

    People.create({name: 'Val'}, function(err, doc) {
      People.findOne({_id: doc._id}, function() {
        assert.equal(postCount, 1);
        db.close(done);
      });
    });
  });

  it('pre-init hooks work', function(done) {
    var schema = new Schema({text: String});

    schema.pre('init', function(next, data) {
      data.text = 'pre init\'d';
      next();
    });

    var db = start(),
        Parent = db.model('Parent', schema);

    Parent.create({
      text: 'not init\'d'
    }, function(err, doc) {
      Parent.findOne({_id: doc._id}, function(err, doc) {
        db.close();

        assert.strictEqual(doc.text, 'pre init\'d');

        done();
      });
    });
  });

  it('post save handles multiple args (gh-3155)', function(done) {
    var schema = new Schema({});

    schema.post('save', function(item, next) {
      next();
    });

    var db = start();
    var Test = db.model('gh3155', schema);

    var t = new Test();
    t.save(function(error, doc, numAffected) {
      assert.strictEqual(numAffected, 1);

      db.close(done);
    });
  });

  it('pre-init hooks on subdocuments work', function(done) {
    var childSchema = new Schema({age: Number});

    childSchema.pre('init', function(next, data) {
      ++data.age;
      next();
      // On subdocuments, you have to return `this`
      return this;
    });

    var parentSchema = new Schema({name: String, children: [childSchema]});
    var db = start(),
        Parent = db.model('ParentWithChildren', parentSchema);

    Parent.create({
      name: 'Bob',
      children: [{age: 8}, {age: 5}]
    }, function(err, doc) {
      Parent.findOne({_id: doc._id}, function(err, doc) {
        db.close();

        assert.strictEqual(doc.children.length, 2);
        assert.strictEqual(doc.children[0].constructor.name, 'EmbeddedDocument');
        assert.strictEqual(doc.children[1].constructor.name, 'EmbeddedDocument');
        assert.strictEqual(doc.children[0].age, 9);
        assert.strictEqual(doc.children[1].age, 6);

        done();
      });
    });
  });

  it('pre-save hooks fire on subdocs before their parent doc', function(done) {
    var childSchema = new Schema({name: String, count: Number});

    childSchema.pre('save', function(next) {
      ++this.count;
      next();
      // On subdocuments, you have to return `this`
      return this;
    });

    var parentSchema = new Schema({
      cumulativeCount: Number,
      children: [childSchema]
    });

    parentSchema.pre('save', function(next) {
      this.cumulativeCount = this.children.reduce(function(seed, child) {
        seed += child.count;
        return seed;
      }, 0);
      next();
    });

    var db = start(),
        Parent = db.model('ParentWithChildren', parentSchema),
        doc = new Parent({children: [{count: 0, name: 'a'}, {count: 1, name: 'b'}]});

    doc.save(function(err, doc1) {
      db.close();

      try {
        assert.strictEqual(doc1.children[0].count, 1);
        assert.strictEqual(doc1.children[1].count, 2);
        assert.strictEqual(doc1.cumulativeCount, 3);
      } catch (e) {
        done(e);
        return;
      }

      done();
    });
  });

  describe('gh-3284', function() {
    it('should call pre hooks on nested subdoc', function(done) {
      var _this = this;

      var childSchema = new Schema({
        title: String
      });

      ['init', 'save', 'validate'].forEach(function(type) {
        childSchema.pre(type, function(next) {
          _this['pre' + type + 'Called'] = true;
          next();
        });
      });

      var parentSchema = new Schema({
        nested: {
          children: [childSchema]
        }
      });

      var db = start();
      db.model('gh-3284', parentSchema);

      var Parent = db.model('gh-3284');

      var parent = new Parent({
        nested: {
          children: [{
            title: 'banana'
          }]
        }
      });

      parent.save().then(function() {
        return Parent.findById(parent._id);
      }).then(function() {
        db.close();
        assert.ok(_this.preinitCalled);
        assert.ok(_this.prevalidateCalled);
        assert.ok(_this.presaveCalled);
        done();
      });
    });
  });

  it('pre set hooks on real documents (gh-3479)', function(done) {
    var bookSchema = new Schema({
      title: String
    });

    var preCalls = [];
    bookSchema.pre('set', function(next, path, val) {
      preCalls.push({path: path, val: val});
      next();
    });

    var Book = mongoose.model('gh3479', bookSchema);

    var book = new Book({});

    book.title = 'Professional AngularJS';
    assert.equal(preCalls.length, 1);
    assert.equal(preCalls[0].path, 'title');
    assert.equal(preCalls[0].val, 'Professional AngularJS');

    done();
  });

  it('nested subdocs only fire once (gh-3281)', function(done) {
    var L3Schema = new Schema({
      title: String
    });

    var calls = 0;
    L3Schema.pre('save', function(next) {
      ++calls;
      return next();
    });

    var L2Schema = new Schema({
      items: [L3Schema]
    });

    var L1Schema = new Schema({
      items: [L2Schema]
    });

    var db = start();
    var L1 = db.model('gh3281', L1Schema);

    var data = {
      items: [{
        items: [{
          title: 'test'
        }]
      }]
    };

    L1.create(data, function(error) {
      assert.ifError(error);
      assert.equal(calls, 1);
      db.close(done);
    });
  });

  it('remove hooks for single nested (gh-3754)', function(done) {
    var db = start();
    var postCount = 0;
    var PhotoSchema = new mongoose.Schema({
      bla: String
    });

    PhotoSchema.post('remove', function() {
      ++postCount;
    });

    var PersonSchema = new mongoose.Schema({
      photo: PhotoSchema
    });

    var Person = db.model('Person', PersonSchema);

    Person.create({photo: {bla: 'test'}}, function(error, person) {
      assert.ifError(error);
      person.photo.remove();
      person.save(function(error1) {
        assert.ifError(error1);
        setTimeout(function() {
          assert.equal(postCount, 1);
          done();
        }, 0);
      });
    });
  });
});
