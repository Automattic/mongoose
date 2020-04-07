'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model: findOneAndReplace:', function() {
  let Comments;
  let BlogPost;
  let db;

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
    Comments = new Schema;

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPost = new Schema({
      title: String,
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [Number],
      owners: [ObjectId],
      comments: [Comments]
    });

    BlogPost.virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    BlogPost.method('cool', function() {
      return this;
    });

    BlogPost.static('woot', function() {
      return this;
    });

    BlogPost = db.model('BlogPost', BlogPost);
  });

  it('returns the original document', function() {
    const M = BlogPost;
    const title = 'remove muah';

    const post = new M({ title: title });

    return co(function*() {
      yield post.save();

      const doc = yield M.findOneAndReplace({ title: title });

      assert.equal(post.id, doc.id);
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    const M = BlogPost;

    const now = new Date;
    let query;

    // Model.findOneAndReplace
    query = M.findOneAndReplace({ author: 'aaron' }, {}, { select: 'author' });
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndReplace({ author: 'aaron' });
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndReplace();
    assert.equal(query.options.new, undefined);
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);

    // Query.findOneAndReplace
    query = M.where('author', 'aaron').findOneAndReplace({ date: now });
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.date, now);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndReplace({ author: 'aaron' }, {}, { select: 'author' });
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndReplace();
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);
    done();
  });

  it('executes when a callback is passed', function(done) {
    const M = BlogPost;
    let pending = 5;

    M.findOneAndReplace({ name: 'aaron1' }, { select: 'name' }, cb);
    M.findOneAndReplace({ name: 'aaron1' }, cb);
    M.where().findOneAndReplace({ name: 'aaron1' }, { select: 'name' }, cb);
    M.where().findOneAndReplace({ name: 'aaron1' }, cb);
    M.where('name', 'aaron1').findOneAndReplace(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(doc, null); // no previously existing doc
      if (--pending) return;
      done();
    }
  });

  it('executed with only a callback throws', function(done) {
    const M = BlogPost;
    let err;

    try {
      M.findOneAndReplace(function() {});
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executed with only a callback throws', function(done) {
    const M = BlogPost;
    let err;

    try {
      M.findByIdAndDelete(function() {});
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executes when a callback is passed', function(done) {
    const M = BlogPost;
    const _id = new DocumentObjectId;
    let pending = 2;

    M.findByIdAndDelete(_id, { select: 'name' }, cb);
    M.findByIdAndDelete(_id, cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.equal(doc, null); // no previously existing doc
      if (--pending) return;
      done();
    }
  });

  it('returns the original document', function(done) {
    const M = BlogPost;
    const title = 'remove muah pleez';

    const post = new M({ title: title });
    post.save(function(err) {
      assert.ifError(err);
      M.findByIdAndDelete(post.id, function(err, doc) {
        assert.ifError(err);
        assert.equal(post.id, doc.id);
        M.findById(post.id, function(err, gone) {
          assert.ifError(err);
          assert.equal(gone, null);
          done();
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    let query;

    // Model.findByIdAndDelete
    query = M.findByIdAndDelete(_id, { select: 'author' });
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions._id.toString(), _id.toString());

    query = M.findByIdAndDelete(_id.toString());
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions._id, _id.toString());

    query = M.findByIdAndDelete();
    assert.equal(query.options.new, undefined);
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions._id, undefined);
    done();
  });

  it('supports v3 select string syntax', function(done) {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 select object syntax', function(done) {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  });

  it('supports v3 sort string syntax', function(done) {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
    done();
  });

  it('supports v3 sort object syntax', function(done) {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
    done();
  });

  it('supports population (gh-1395)', function(done) {
    const M = db.model('Test1', { name: String });
    const N = db.model('Test2', { a: { type: Schema.ObjectId, ref: 'Test1' }, i: Number });

    M.create({ name: 'i am an A' }, function(err, a) {
      if (err) return done(err);
      N.create({ a: a._id, i: 10 }, function(err, b) {
        if (err) return done(err);

        N.findOneAndReplace({ _id: b._id }, { a: a._id })
          .populate('a')
          .exec(function(err, doc) {
            if (err) return done(err);
            assert.ok(doc);
            assert.ok(doc.a);
            assert.equal(doc.a.name, 'i am an A');
            done();
          });
      });
    });
  });

  it('only calls setters once (gh-6203)', function() {
    return co(function*() {
      const calls = [];
      const userSchema = new mongoose.Schema({
        name: String,
        foo: {
          type: String,
          set: function(val) {
            calls.push(val);
            return val + val;
          }
        }
      });
      const Model = db.model('Test', userSchema);

      yield Model.findOneAndReplace({ foo: '123' }, { name: 'bar' });

      assert.deepEqual(calls, ['123']);
    });
  });

  describe('middleware', function() {
    it('works', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndReplace', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndReplace', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.findOneAndReplace(
          { base: 'eggs' },
          {},
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal(breakfast.base, 'eggs');
            assert.equal(preCount, 1);
            assert.equal(postCount, 1);
            done();
          });
      });
    });

    it('works with exec() (gh-439)', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndReplace', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndReplace', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      breakfast.save(function(error) {
        assert.ifError(error);

        Breakfast.
          findOneAndReplace({ base: 'eggs' }, {}).
          exec(function(error, breakfast) {
            assert.ifError(error);
            assert.equal(breakfast.base, 'eggs');
            assert.equal(preCount, 1);
            assert.equal(postCount, 1);
            done();
          });
      });
    });
  });

  it('works (gh-7654)', function() {
    const schema = new Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);

    return co(function*() {
      yield Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, { upsert: true });

      const doc = yield Model.findOne();
      assert.equal(doc.name, 'Jean-Luc Picard');

      const err = yield Model.findOneAndReplace({}, { age: 'not a number' }, {}).
        then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.errors['age'].message.indexOf('not a number') !== -1,
        err.errors['age'].message);
    });
  });

  it('schema-level projection (gh-7654)', function() {
    const schema = new Schema({ name: String, age: { type: Number, select: false } });
    const Model = db.model('Test', schema);

    return co(function*() {
      const doc = yield Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, {
        upsert: true,
        returnOriginal: false
      });

      assert.ok(!doc.age);
    });
  });

  it('supports `new` in addition to `returnOriginal` (gh-7846)', function() {
    const schema = new Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);

    return co(function*() {
      const doc = yield Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, {
        upsert: true,
        new: true
      });

      assert.equal(doc.age, 59);
    });
  });

  it('orFail() (gh-8030)', function() {
    const schema = Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);

    return co(function*() {
      let err = yield Model.findOneAndReplace({}, { name: 'test' }).orFail().
        then(() => assert.ok(false), err => err);

      assert.ok(err);
      assert.equal(err.name, 'DocumentNotFoundError');

      yield Model.create({ name: 'test' });
      err = yield Model.findOneAndReplace({ name: 'test' }, { name: 'test2' }).
        orFail().
        then(() => null, err => err);

      assert.ifError(err);
    });
  });
});
