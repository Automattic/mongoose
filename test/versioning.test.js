'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const VersionError = mongoose.Error.VersionError;

describe('versioning', function() {
  let db;
  let Comments;
  let BlogPost;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(function() {
    Comments = new Schema();

    Comments.add({
      title: String,
      date: Date,
      comments: [Comments],
      dontVersionMeEither: []
    });

    BlogPost = new Schema(
      {
        title: String,
        date: Date,
        meta: {
          date: Date,
          visitors: Number,
          nested: [Comments],
          numbers: [Number]
        },
        mixed: {},
        numbers: [Number],
        comments: [Comments],
        arr: [],
        dontVersionMe: []
      },
      {
        collection: 'versioning_' + random(),
        skipVersioning: {
          dontVersionMe: true,
          'comments.dontVersionMeEither': true
        }
      });

    BlogPost = db.model('BlogPost', BlogPost);
  });

  it('is only added to parent schema (gh-1265)', function(done) {
    assert.ok(BlogPost.schema.path('__v'));
    assert.ok(!BlogPost.schema.path('comments').__v);
    assert.ok(!BlogPost.schema.path('meta.nested').__v);
    done();
  });

  it('versioning without version key', function(done) {
    const V = BlogPost;

    const doc = new V;
    doc.numbers = [3, 4, 5, 6, 7];
    doc.comments = [
      { title: 'does it work?', date: new Date },
      { title: '1', comments: [{ title: 'this is sub #1' }, { title: 'this is sub #2' }] },
      { title: '2', comments: [{ title: 'this is sub #3' }, { title: 'this is sub #4' }] },
      { title: 'hi', date: new Date }
    ];

    function test(err) {
      assert.ifError(err);
      // test getting docs back from db missing version key
      V.findById(doc).select('numbers comments').exec(function(err, doc) {
        assert.ifError(err);
        doc.comments[0].title = 'no version was included';
        const d = doc.$__delta();
        assert.ok(!d[0].__v, 'no version key was selected so should not be included');
        done();
      });
    }

    doc.save(test);
  });

  it('version works with strict docs', function(done) {
    const schema = new Schema({ str: ['string'] }, { strict: true, collection: 'versionstrict_' + random() });
    db.deleteModel(/BlogPost/);
    const M = db.model('BlogPost', schema);
    const m = new M({ str: ['death', 'to', 'smootchy'] });
    m.save(function(err) {
      assert.ifError(err);
      M.find(m, function(err, m) {
        assert.ifError(err);
        assert.equal(m.length, 1);
        m = m[0];
        assert.equal(m._doc.__v, 0);
        m.str.pull('death');
        m.save(function(err) {
          assert.ifError(err);
          M.findById(m, function(err, m) {
            assert.ifError(err);
            assert.equal(m._doc.__v, 1);
            assert.equal(m.str.length, 2);
            assert.ok(!~m.str.indexOf('death'));
            done();
          });
        });
      });
    });
  });

  it('version works with existing unversioned docs', function(done) {
    const V = BlogPost;

    V.collection.insertOne({ title: 'unversioned', numbers: [1, 2, 3] }, { safe: true }, function(err) {
      assert.ifError(err);
      V.findOne({ title: 'unversioned' }, function(err, d) {
        assert.ifError(err);
        assert.ok(!d._doc.__v);
        d.numbers.splice(1, 1, 10);
        const o = d.$__delta();
        assert.equal(o[0].__v, undefined);
        assert.ok(o[1].$inc);
        assert.equal(o[1].$inc.__v, 1);
        d.save(function(err, d) {
          assert.ifError(err);
          assert.equal(d._doc.__v, 1);
          V.findById(d, function(err, d) {
            assert.ifError(err);
            assert.ok(d);
            done();
          });
        });
      });
    });
  });

  it('versionKey is configurable', function(done) {
    const schema = new Schema(
      { configured: 'bool' },
      { versionKey: 'lolwat', collection: 'configuredversion' + random() });
    const V = db.model('Test', schema);
    const v = new V({ configured: true });
    v.save(function(err) {
      assert.ifError(err);
      V.findById(v, function(err1, v) {
        assert.ifError(err1);
        assert.equal(v._doc.lolwat, 0);
        done();
      });
    });
  });

  it('can be disabled', function(done) {
    const schema = new Schema({ x: ['string'] }, { versionKey: false });
    const M = db.model('Test', schema);
    M.create({ x: ['hi'] }, function(err, doc) {
      assert.ifError(err);
      assert.equal('__v' in doc._doc, false);
      doc.x.pull('hi');
      doc.save(function(err) {
        assert.ifError(err);
        assert.equal('__v' in doc._doc, false);

        doc.set('x.0', 'updated');
        const d = doc.$__delta()[0];
        assert.equal(d.__v, undefined, 'version should not be added to where clause');

        M.collection.findOne({ _id: doc._id }, function(err, doc) {
          assert.equal('__v' in doc, false);
          done();
        });
      });
    });
  });

  it('works with numbericAlpha paths', function(done) {
    const M = BlogPost;
    const m = new M({ mixed: {} });
    const path = 'mixed.4a';
    m.set(path, 2);
    m.save(function(err) {
      assert.ifError(err);
      done();
    });
  });

  describe('doc.increment()', function() {
    it('works without any other changes (gh-1475)', function(done) {
      const V = BlogPost;

      const doc = new V;
      doc.save(function(err) {
        assert.ifError(err);
        assert.equal(doc.__v, 0);

        doc.increment();

        doc.save(function(err) {
          assert.ifError(err);

          assert.equal(doc.__v, 1);

          V.findById(doc, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.__v, 1);
            done();
          });
        });
      });
    });
  });

  it('allows concurrent push', function() {
    return co(function*() {
      let a = new BlogPost({
        meta: {
          numbers: []
        }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.numbers.push(2);
      b.meta.numbers.push(4);

      yield a.save();
      yield b.save();

      a = yield BlogPost.findById(a);
      assert.deepEqual(a.toObject().meta.numbers, [2, 4]);
      assert.equal(a._doc.__v, 2);
    });
  });

  it('allows concurrent push and pull', function() {
    return co(function*() {
      let a = new BlogPost({
        meta: {
          numbers: [2, 4, 6, 8]
        }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.numbers.pull(2);
      b.meta.numbers.push(10);

      yield [a.save(), b.save()];

      a = yield BlogPost.findById(a);
      assert.deepEqual(a.toObject().meta.numbers, [4, 6, 8, 10]);
      assert.equal(a._doc.__v, 2);
    });
  });

  it('throws if you set a positional path after pulling', function() {
    return co(function*() {
      let a = new BlogPost({
        meta: {
          numbers: [2, 4, 6, 8]
        }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.numbers.pull(4, 6);
      b.set('meta.numbers.2', 7);

      yield a.save();
      const err = yield b.save().then(() => null, err => err);

      assert.ok(/No matching document/.test(err.message), err.message);
      a = yield BlogPost.findById(a);
      assert.equal(a._doc.__v, 1);
    });
  });

  it('allows pull/push after $set', function() {
    return co(function*() {
      let a = new BlogPost({
        arr: ['test1', 10]
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.set('arr.0', 'not an array');
      // should overwrite a's changes, last write wins
      b.arr.pull(10);
      b.arr.addToSet('using set');

      yield a.save();
      yield b.save();

      a = yield BlogPost.findById(a);
      assert.deepEqual(a.toObject().arr, ['test1', 'using set']);
    });
  });

  it('should add version to where clause', function() {
    return co(function*() {
      let a = new BlogPost({
        arr: [['before update']]
      });
      yield a.save();

      assert.equal(a._doc.__v, 0);

      a.set('arr.0.0', 'updated');
      const d = a.$__delta();
      assert.equal(a._doc.__v, d[0].__v, 'version should be added to where clause');
      assert.ok(!('$inc' in d[1]));

      yield a.save();

      a = yield BlogPost.findById(a);
      assert.equal(a.arr[0][0], 'updated');
      assert.equal(a._doc.__v, 0);
    });
  });

  it('$set after pull/push throws', function() {
    return co(function*() {
      const a = new BlogPost({
        arr: ['test1', 'using set']
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      b.set('arr.0', 'not an array');
      // force a $set
      a.arr.pull('using set');
      a.arr.push('woot', 'woot2');
      a.arr.$pop();

      yield a.save();
      const err = yield b.save().then(() => null, err => err);

      assert.ok(/No matching document/.test(err.message), err.message);
    });
  });

  it('doesnt persist conflicting changes', function() {
    return co(function*() {
      const a = new BlogPost({
        meta: { nested: [{ title: 'test1' }, { title: 'test2' }] }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.nested.$pop();
      b.meta.nested.$pop();
      yield a.save();
      const err = yield b.save().then(() => null, err => err);

      assert.ok(/No matching document/.test(err.message), err.message);
    });
  });

  it('increments version on push', function() {
    return co(function*() {
      let a = new BlogPost({
        meta: { nested: [] }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.nested.push({ title: 'test1' });
      a.meta.nested.push({ title: 'test2' });
      b.meta.nested.push({ title: 'test3' });
      yield a.save();
      yield b.save();

      a = yield BlogPost.findById(a);
      assert.equal(a._doc.__v, 2);
      assert.deepEqual(a.meta.nested.map(v => v.title), ['test1', 'test2', 'test3']);
    });
  });

  it('does not increment version when setting nested paths', function() {
    return co(function*() {
      let a = new BlogPost({
        meta: {
          nested: [{ title: 'test1' }, { title: 'test2' }, { title: 'test3' }]
        }
      });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.meta.nested[2].title = 'two';
      b.meta.nested[0].title = 'zero';
      b.meta.nested[1].title = 'sub one';

      yield [a.save(), b.save()];
      assert.equal(a._doc.__v, 0);

      a = yield BlogPost.findById(a);
      assert.equal(a.meta.nested[2].title, 'two');
      assert.equal(a.meta.nested[0].title, 'zero');
    });
  });

  it('increments version when modifying mixed array', function() {
    return co(function*() {
      const a = new BlogPost({ mixed: { arr: [] } });
      yield a.save();

      assert.equal(a._doc.__v, 0);

      a.mixed.arr.push([10], { x: 1 }, 'test');
      a.markModified('mixed.arr');

      yield a.save();

      assert.equal(a._doc.__v, 1);
      assert.equal(a.mixed.arr.length, 3);
      assert.equal(a.mixed.arr[1].x, 1);
      assert.equal(a.mixed.arr[2], 'test');
      assert.equal(a.mixed.arr[0][0], 10);
    });
  });

  it('increments version when $set-ing an array', function() {
    return co(function*() {
      const a = new BlogPost({});
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.comments.addToSet({ title: 'monkey' });
      b.markModified('comments');

      const d = b.$__delta();
      assert.ok(d[1].$inc, 'a $set of an array should trigger versioning');

      yield a.save();
      const err = yield b.save().then(() => null, err => err);

      assert.ok(err instanceof VersionError);
      assert.ok(err.stack.indexOf('versioning.test.js') !== -1);
      assert.ok(/No matching document/.test(err), 'changes to b should not be applied');
      assert.equal(a.comments.length, 1);
    });
  });

  it('increments version and converts to $set when mixing $shift and $addToSet', function() {
    return co(function*() {
      const a = new BlogPost({});
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.comments.addToSet({ title: 'aven' });
      a.comments.addToSet({ title: 'avengers' });
      let d = a.$__delta();

      assert.equal(d[0].__v, undefined, 'version should not be included in where clause');
      assert.ok(!d[1].$set);
      assert.ok(d[1].$addToSet);
      assert.ok(d[1].$addToSet.comments);

      a.comments.$shift();
      d = a.$__delta();
      assert.equal(d[0].__v, 0, 'version should be included in where clause');
      assert.ok(d[1].$set, 'two differing atomic ops on same path should create a $set');
      assert.ok(d[1].$inc, 'a $set of an array should trigger versioning');
      assert.ok(!d[1].$addToSet);

      yield [a.save(), b.save()];
    });
  });

  it('should not increment version for non-versioned fields', function() {
    return co(function*() {
      const a = new BlogPost({});
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.dontVersionMe.push('value1');
      b.dontVersionMe.push('value2');
      yield [a.save(), b.save()];

      assert.equal(a._doc.__v, 0);
    });
  });

  it('should not increment version for non-versioned sub-document fields', function() {
    return co(function*() {
      const a = new BlogPost({ comments: [{ title: 'test' }] });
      yield a.save();
      const b = yield BlogPost.findById(a);

      assert.equal(a._doc.__v, 0);

      a.comments[0].dontVersionMeEither.push('value1');
      b.comments[0].dontVersionMeEither.push('value2');
      yield [a.save(), b.save()];

      assert.equal(a._doc.__v, 0);
    });
  });

  describe('versioning is off', function() {
    it('when { safe: false } is set (gh-1520)', function(done) {
      const schema1 = new Schema({ title: String }, { safe: false });
      assert.equal(schema1.options.versionKey, false);
      done();
    });
    it('when { safe: { w: 0 }} is set (gh-1520)', function(done) {
      const schema1 = new Schema({ title: String }, { safe: { w: 0 } });
      assert.equal(schema1.options.versionKey, false);
      done();
    });
  });

  it('gh-1898', function(done) {
    const schema = new Schema({ tags: [String], name: String });

    const M = db.model('Test', schema);

    const m = new M({ tags: ['eggs'] });

    m.save(function(err) {
      assert.ifError(err);

      m.tags.push('bacon');
      m.name = 'breakfast';
      m.tags[0] = 'eggs';
      m.markModified('tags.0');

      assert.equal(m.$__where(m.$__delta()[0]).__v, 0);
      assert.equal(m.$__delta()[1].$inc.__v, 1);
      done();
    });
  });

  it('can remove version key from toObject() (gh-2675)', function(done) {
    const schema = new Schema({ name: String });
    const M = db.model('Test', schema);

    const m = new M();
    m.save(function(err, m) {
      assert.ifError(err);
      let obj = m.toObject();
      assert.equal(obj.__v, 0);
      obj = m.toObject({ versionKey: false });
      assert.equal(obj.__v, undefined);
      done();
    });
  });

  it('pull doesnt add version where clause (gh-6190)', function() {
    const User = db.model('User', new mongoose.Schema({
      unreadPosts: [{ type: mongoose.Schema.Types.ObjectId }]
    }));

    return co(function*() {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      const doc = yield User.create({
        unreadPosts: [id1, id2]
      });

      const doc1 = yield User.findById(doc._id);
      const doc2 = yield User.findById(doc._id);

      doc1.unreadPosts.pull(id1);
      yield doc1.save();

      doc2.unreadPosts.pull(id2);
      yield doc2.save();

      const doc3 = yield User.findById(doc._id);
      assert.equal(doc3.unreadPosts.length, 0);
    });
  });

  it('copying doc works (gh-5779)', function(done) {
    const schema = new Schema({ subdocs: [{ a: Number }] });
    const M = db.model('Test', schema);
    const m = new M({ subdocs: [] });
    let m2;

    m.save().
      then(function() {
        m2 = new M(m);
        m2.subdocs.push({ a: 2 });
        return m2.save();
      }).
      then(function() {
        m2.subdocs[0].a = 3;
        return m2.save();
      }).
      then(function() {
        assert.equal(m2.subdocs[0].a, 3);
        return M.findById(m._id);
      }).
      then(function(doc) {
        assert.equal(doc.subdocs[0].a, 3);
        done();
      }).
      catch(done);
  });

  it('optimistic concurrency (gh-9001) (gh-5424)', function() {
    const schema = new Schema({ name: String }, { optimisticConcurrency: true });
    const M = db.model('Test', schema);

    const doc = new M({ name: 'foo' });

    return co(function*() {
      yield doc.save();

      const d1 = yield M.findOne();
      const d2 = yield M.findOne();

      d1.name = 'bar';
      yield d1.save();

      d2.name = 'qux';
      const err = yield d2.save().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.name, 'VersionError');
    });
  });
});
