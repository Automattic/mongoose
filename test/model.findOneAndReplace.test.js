'use strict';

/**
 * Test dependencies.
 */

const sinon = require('sinon');
const start = require('./common');

const assert = require('assert');

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

    const doc = await M.findOneAndReplace({ title: title });
    assert.equal(post.id, doc.id);
  });

  it('options/conditions/doc are merged when no callback is passed', function() {
    const M = BlogPost;

    const now = new Date();
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
  });

  it('returns the original document', async function() {
    const M = BlogPost;
    const title = 'remove muah pleez';

    const post = await M.create({ title: title });
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

    const query = M.findOneAndReplace({}, {}, { select: 'author -title' });
    query._applyPaths();
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 select object syntax', function() {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 sort string syntax', function() {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
  });

  it('supports v3 sort object syntax', function() {
    const M = BlogPost;

    const query = M.findOneAndReplace({}, {}, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);
  });

  it('supports population (gh-1395)', async function() {
    const M = db.model('Test1', { name: String });
    const N = db.model('Test2', { a: { type: Schema.ObjectId, ref: 'Test1' }, i: Number });

    const a = await M.create({ name: 'i am an A' });

    const b = await N.create({ a: a._id, i: 10 });

    const doc = await N.findOneAndReplace({ _id: b._id }, { a: a._id })
      .populate('a')
      .exec();

    assert.ok(doc);
    assert.ok(doc.a);
    assert.equal(doc.a.name, 'i am an A');
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

    await Model.findOneAndReplace({ foo: '123' }, { name: 'bar' });

    assert.deepEqual(calls, ['123']);
  });

  describe('middleware', function() {
    it('works', async function() {
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
      await Breakfast.create({ base: 'eggs' });


      const breakfast = await Breakfast.findOneAndReplace({ base: 'eggs' }, {});
      assert.equal(breakfast.base, 'eggs');
      assert.equal(preCount, 1);
      assert.equal(postCount, 1);
    });

    it('works with exec() (gh-439)', async function() {
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

      await breakfast.save();

      const updatedBreakfast = await Breakfast.findOneAndReplace({ base: 'eggs' }, {}).exec();

      assert.equal(updatedBreakfast.base, 'eggs');
      assert.equal(preCount, 1);
      assert.equal(postCount, 1);
    });
  });

  it('works (gh-7654)', async function() {
    const schema = new Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);

    await Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, { upsert: true });

    const doc = await Model.findOne();
    assert.equal(doc.name, 'Jean-Luc Picard');

    const err = await Model.findOneAndReplace({}, { age: 'not a number' }, {}).
      then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['age'].message.indexOf('not a number') !== -1,
      err.errors['age'].message);
  });

  it('schema-level projection (gh-7654)', async function() {
    const schema = new Schema({ name: String, age: { type: Number, select: false } });
    const Model = db.model('Test', schema);

    const doc = await Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, {
      upsert: true,
      returnOriginal: false
    });

    assert.ok(!doc.age);
  });

  it('supports `new` in addition to `returnOriginal` (gh-7846)', async function() {
    const schema = new Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);


    const doc = await Model.findOneAndReplace({}, { name: 'Jean-Luc Picard', age: 59 }, {
      upsert: true,
      new: true
    });

    assert.equal(doc.age, 59);
  });

  it('orFail() (gh-8030)', async function() {
    const schema = Schema({ name: String, age: Number });
    const Model = db.model('Test', schema);


    let err = await Model.findOneAndReplace({}, { name: 'test' }).orFail().
      then(() => assert.ok(false), err => err);

    assert.ok(err);
    assert.equal(err.name, 'DocumentNotFoundError');

    await Model.create({ name: 'test' });
    err = await Model.findOneAndReplace({ name: 'test' }, { name: 'test2' }).
      orFail().
      then(() => null, err => err);

    assert.ifError(err);
  });

  it('skips validation if `runValidators` === false (gh-11559)', async function() {
    const testSchema = new Schema({
      name: {
        type: String,
        required: true // you had a typo here
      }
    });
    const Test = db.model('Test', testSchema);
    const entry = await Test.create({
      name: 'Test'
    });

    await Test.findOneAndReplace(
      { name: 'Test' },
      {}, // this part is key, I am trying to replace without required fields
      { runValidators: false }
    );

    const doc = await Test.findById(entry);
    assert.strictEqual(doc.name, undefined);
  });

  it('does not send overwrite or timestamps option to MongoDB', async function() {
    const testSchema = new Schema({
      name: String
    });
    const Test = db.model('Test', testSchema);

    sinon.stub(Test.collection, 'findOneAndReplace').callsFake(() => Promise.resolve({}));

    await Test.findOneAndReplace(
      { name: 'Test' },
      {},
      { timestamps: true }
    );

    assert.ok(Test.collection.findOneAndReplace.calledOnce);
    const opts = Test.collection.findOneAndReplace.getCalls()[0].args[2];
    assert.ok(!Object.keys(opts).includes('overwrite'));
    assert.ok(!Object.keys(opts).includes('timestamps'));
  });
});
