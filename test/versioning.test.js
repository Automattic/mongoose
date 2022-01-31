'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

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

  after(async function() {
    await db.close();
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

    V.collection.insertOne({ title: 'unversioned', numbers: [1, 2, 3] }, function(err) {
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

  it('allows concurrent push', async function() {

    let a = new BlogPost({
      meta: {
        numbers: []
      }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.numbers.push(2);
    b.meta.numbers.push(4);

    await a.save();
    await b.save();

    a = await BlogPost.findById(a);
    assert.deepEqual(a.toObject().meta.numbers, [2, 4]);
    assert.equal(a._doc.__v, 2);
  });

  it('allows concurrent push and pull', async function() {

    let a = new BlogPost({
      meta: {
        numbers: [2, 4, 6, 8]
      }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.numbers.pull(2);
    b.meta.numbers.push(10);

    await a.save();
    await b.save();

    a = await BlogPost.findById(a);
    assert.deepEqual(a.toObject().meta.numbers, [4, 6, 8, 10]);
    assert.equal(a._doc.__v, 2);
  });

  it('throws if you set a positional path after pulling', async function() {

    let a = new BlogPost({
      meta: {
        numbers: [2, 4, 6, 8]
      }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.numbers.pull(4, 6);
    b.set('meta.numbers.2', 7);

    await a.save();
    const err = await b.save().then(() => null, err => err);

    assert.ok(/No matching document/.test(err.message), err.message);
    a = await BlogPost.findById(a);
    assert.equal(a._doc.__v, 1);
  });

  it('allows pull/push after $set', async function() {

    let a = new BlogPost({
      arr: ['test1', 10]
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.set('arr.0', 'not an array');
    // should overwrite a's changes, last write wins
    b.arr.pull(10);
    b.arr.addToSet('using set');

    await a.save();
    await b.save();

    a = await BlogPost.findById(a);
    assert.deepEqual(a.toObject().arr, ['test1', 'using set']);
  });

  it('should add version to where clause', async function() {

    let a = new BlogPost({
      arr: [['before update']]
    });
    await a.save();

    assert.equal(a._doc.__v, 0);

    a.set('arr.0.0', 'updated');
    const d = a.$__delta();
    assert.equal(a._doc.__v, d[0].__v, 'version should be added to where clause');
    assert.ok(!('$inc' in d[1]));

    await a.save();

    a = await BlogPost.findById(a);
    assert.equal(a.arr[0][0], 'updated');
    assert.equal(a._doc.__v, 0);
  });

  it('$set after pull/push throws', async function() {

    const a = new BlogPost({
      arr: ['test1', 'using set']
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    b.set('arr.0', 'not an array');
    // force a $set
    a.arr.pull('using set');
    a.arr.push('woot', 'woot2');
    a.arr.$pop();

    await a.save();
    const err = await b.save().then(() => null, err => err);

    assert.ok(/No matching document/.test(err.message), err.message);
  });

  it('doesnt persist conflicting changes', async function() {

    const a = new BlogPost({
      meta: { nested: [{ title: 'test1' }, { title: 'test2' }] }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.nested.$pop();
    b.meta.nested.$pop();
    await a.save();
    const err = await b.save().then(() => null, err => err);

    assert.ok(/No matching document/.test(err.message), err.message);
  });

  it('increments version on push', async function() {

    let a = new BlogPost({
      meta: { nested: [] }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.nested.push({ title: 'test1' });
    a.meta.nested.push({ title: 'test2' });
    b.meta.nested.push({ title: 'test3' });
    await a.save();
    await b.save();

    a = await BlogPost.findById(a);
    assert.equal(a._doc.__v, 2);
    assert.deepEqual(a.meta.nested.map(v => v.title), ['test1', 'test2', 'test3']);
  });

  it('does not increment version when setting nested paths', async function() {

    let a = new BlogPost({
      meta: {
        nested: [{ title: 'test1' }, { title: 'test2' }, { title: 'test3' }]
      }
    });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.meta.nested[2].title = 'two';
    b.meta.nested[0].title = 'zero';
    b.meta.nested[1].title = 'sub one';

    await Promise.all([a.save(), b.save()]);
    assert.equal(a._doc.__v, 0);

    a = await BlogPost.findById(a);
    assert.equal(a.meta.nested[2].title, 'two');
    assert.equal(a.meta.nested[0].title, 'zero');
  });

  it('increments version when modifying mixed array', async function() {

    const a = new BlogPost({ mixed: { arr: [] } });
    await a.save();

    assert.equal(a._doc.__v, 0);

    a.mixed.arr.push([10], { x: 1 }, 'test');
    a.markModified('mixed.arr');

    await a.save();

    assert.equal(a._doc.__v, 1);
    assert.equal(a.mixed.arr.length, 3);
    assert.equal(a.mixed.arr[1].x, 1);
    assert.equal(a.mixed.arr[2], 'test');
    assert.equal(a.mixed.arr[0][0], 10);
  });

  it('increments version when $set-ing an array', async function() {

    const a = new BlogPost({});
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.comments.addToSet({ title: 'monkey' });
    b.markModified('comments');

    const d = b.$__delta();
    assert.ok(d[1].$inc, 'a $set of an array should trigger versioning');

    await a.save();
    const err = await b.save().then(() => null, err => err);

    assert.ok(err instanceof VersionError);
    assert.ok(err.stack.indexOf('versioning.test.js') !== -1);
    assert.ok(/No matching document/.test(err), 'changes to b should not be applied');
    assert.equal(a.comments.length, 1);
  });

  it('increments version and converts to $set when mixing $shift and $addToSet', async function() {

    const a = new BlogPost({});
    await a.save();
    const b = await BlogPost.findById(a);

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

    await Promise.all([a.save(), b.save()]);
  });

  it('should not increment version for non-versioned fields', async function() {

    const a = new BlogPost({});
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.dontVersionMe.push('value1');
    b.dontVersionMe.push('value2');
    await Promise.all([a.save(), b.save()]);

    assert.equal(a._doc.__v, 0);
  });

  it('should not increment version for non-versioned sub-document fields', async function() {

    const a = new BlogPost({ comments: [{ title: 'test' }] });
    await a.save();
    const b = await BlogPost.findById(a);

    assert.equal(a._doc.__v, 0);

    a.comments[0].dontVersionMeEither.push('value1');
    b.comments[0].dontVersionMeEither.push('value2');
    await Promise.all([a.save(), b.save()]);

    assert.equal(a._doc.__v, 0);
  });

  it('should persist correctly when optimisticConcurrency is true gh-10128', async function() {
    const thingSchema = new Schema({ price: Number }, { optimisticConcurrency: true });
    const Thing = db.model('Thing', thingSchema);

    const thing = await Thing.create({ price: 1 });
    await thing.save();
    assert.equal(thing.__v, 0);
    const thing_1 = await Thing.findById(thing.id);
    const thing_2 = await Thing.findById(thing.id);
    thing_1.set({ price: 2 });
    await thing_1.save();
    assert.equal(thing_1.__v, 1);
    thing_2.set({ price: 1 });
    const err = await thing_2.save().then(() => null, err => err);
    assert.equal(err.name, 'DocumentNotFoundError');
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

  it('pull doesnt add version where clause (gh-6190)', async function() {
    const User = db.model('User', new mongoose.Schema({
      unreadPosts: [{ type: mongoose.Schema.Types.ObjectId }]
    }));


    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const doc = await User.create({
      unreadPosts: [id1, id2]
    });

    const doc1 = await User.findById(doc._id);
    const doc2 = await User.findById(doc._id);

    doc1.unreadPosts.pull(id1);
    await doc1.save();

    doc2.unreadPosts.pull(id2);
    await doc2.save();

    const doc3 = await User.findById(doc._id);
    assert.equal(doc3.unreadPosts.length, 0);
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

  it('optimistic concurrency (gh-9001) (gh-5424)', async function() {
    const schema = new Schema({ name: String }, { optimisticConcurrency: true });
    const M = db.model('Test', schema);

    const doc = new M({ name: 'foo' });


    await doc.save();

    const d1 = await M.findOne();
    const d2 = await M.findOne();

    d1.name = 'bar';
    await d1.save();

    d2.name = 'qux';
    const err = await d2.save().then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'VersionError');
  });

  it('adds version to filter if pushing to a nested array (gh-11108)', async function() {
    const Test = db.model('Test', Schema({ comments: [{ likedBy: [String] }] }));
    const entry = await Test.create({
      comments: [{ likedBy: ['Friends', 'Family'] }]
    });

    const post1 = await Test.findById(entry._id).exec();
    const post2 = await Test.findById(entry._id).exec();

    post1.comments = [{ likedBy: ['test'] }];
    await post1.save();

    let comment = post2.comments[0];
    comment.likedBy.push('Some User');

    const err = await post2.save().then(() => null, err => err);
    assert.equal(err.name, 'VersionError');

    const post3 = await Test.findById(entry._id).exec();
    comment = post3.comments[0];
    comment.likedBy.push('Some User');
    await post3.save();
    assert.equal(post3.__v, 2);
  });
});
