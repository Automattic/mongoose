'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model: findOneAndDelete:', function() {
  let Comments;
  let BlogPost;
  let db;

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

  it('returns the original document', async function() {
    const M = BlogPost;
    const title = 'remove muah';

    const post = new M({ title: title });

    await post.save();

    const doc = await M.findOneAndDelete({ title: title });

    assert.equal(post.id, doc.id);

    const gone = await M.findById(post.id);
    assert.equal(gone, null);
  });

  it('options/conditions/doc are merged when no callback is passed', function() {
    const M = BlogPost;

    const now = new Date();
    let query;

    // Model.findOneAndDelete
    query = M.findOneAndDelete({ author: 'aaron' }, { select: 'author' });
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndDelete({ author: 'aaron' });
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, 'aaron');

    query = M.findOneAndDelete();
    assert.equal(query.options.new, undefined);
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);

    // Query.findOneAndDelete
    query = M.where('author', 'aaron').findOneAndDelete({ date: now });
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.date, now);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndDelete({ author: 'aaron' }, { select: 'author' });
    assert.equal(query._fields.author, 1);
    assert.equal(query._conditions.author, 'aaron');

    query = M.find().findOneAndDelete();
    assert.equal(query._fields, undefined);
    assert.equal(query._conditions.author, undefined);
  });

  it('returns the original document', async function() {
    const M = BlogPost;
    const title = 'remove muah pleez';

    const post = new M({ title: title });
    await post.save();

    const doc = await M.findByIdAndDelete(post.id);

    assert.equal(post.id, doc.id);
    const gone = await M.findById(post.id);

    assert.equal(gone, null);
  });

  it('options/conditions/doc are merged when no callback is passed', function() {
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
  });

  it('supports v3 select string syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    let query;

    query = M.findByIdAndDelete(_id, { select: 'author -title' });
    query._applyPaths();
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndDelete({}, { select: 'author -title' });
    query._applyPaths();
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 select object syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    let query;

    query = M.findByIdAndDelete(_id, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndDelete({}, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 sort string syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    let query;

    query = M.findByIdAndDelete(_id, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndDelete({}, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
  });

  it('supports v3 sort object syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    let query;

    query = M.findByIdAndDelete(_id, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndDelete(_id, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
  });

  it('supports population (gh-1395)', async function() {
    const M = db.model('Test1', { name: String });
    const N = db.model('Test2', { a: { type: Schema.ObjectId, ref: 'Test1' }, i: Number });

    const a = await M.create({ name: 'i am an A' });

    const b = await N.create({ a: a._id, i: 10 });

    const doc = await N.findOneAndDelete({ _id: b._id }, { select: 'a -_id' })
      .populate('a')
      .exec();

    assert.ok(doc);
    assert.equal(doc._id, undefined);
    assert.ok(doc.a);
    assert.equal('i am an A', doc.a.name);
  });

  it('only calls setters once (gh-6203)', async function() {
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

    await Model.findOneAndDelete({ foo: '123' }, { name: 'bar' });

    assert.deepEqual(calls, ['123']);
  });

  describe('middleware', function() {
    it('works', async function() {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndDelete', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndDelete', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      await breakfast.save();


      const deletedBreakfast = await Breakfast.findOneAndDelete(
        { base: 'eggs' },
        {}
      );

      assert.equal(deletedBreakfast.base, 'eggs');
      assert.equal(preCount, 1);
      assert.equal(postCount, 1);
    });

    it('works with exec() (gh-439)', async function() {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndDelete', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndDelete', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);
      const breakfast = new Breakfast({
        base: 'eggs'
      });

      await breakfast.save();


      const updatedBreakfast = await Breakfast.
        findOneAndDelete({ base: 'eggs' }, {}).
        exec();

      assert.equal(updatedBreakfast.base, 'eggs');
      assert.equal(preCount, 1);
      assert.equal(postCount, 1);
    });
  });
});
