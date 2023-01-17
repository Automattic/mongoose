'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const CastError = require('../lib/error/cast');
const assert = require('assert');
const mongoose = start.mongoose;
const random = require('./util').random;
const Utils = require('../lib/utils');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const isEqual = require('lodash.isequal');
const isEqualWith = require('lodash.isequalwith');
const util = require('./util');
const uuid = require('uuid');

describe('model: findOneAndUpdate:', function() {
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
  afterEach(() => util.clearTestData(db));
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

  it('returns the edited document', function(done) {
    const M = BlogPost;
    const title = 'Tobi ' + random();
    const author = 'Brian ' + random();
    const newTitle = 'Woot ' + random();
    const id0 = new DocumentObjectId();
    const id1 = new DocumentObjectId();

    const post = new M();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function(err) {
      assert.ifError(err);
      M.findById(post._id, function(err, cf) {
        assert.ifError(err);
        assert.equal(cf.title, title);
        assert.equal(cf.author, author);
        assert.equal(cf.meta.visitors.valueOf(), 0);
        assert.equal(cf.date, post.date.toString());
        assert.equal(cf.published, true);
        assert.equal(cf.mixed.x, 'ex');
        assert.deepEqual([4, 5, 6, 7], cf.numbers.toObject());
        assert.equal(cf.owners.length, 2);
        assert.equal(cf.owners[0].toString(), id0.toString());
        assert.equal(cf.owners[1].toString(), id1.toString());
        assert.equal(cf.comments.length, 2);
        assert.equal(cf.comments[0].body, 'been there');
        assert.equal(cf.comments[1].body, 'done that');
        assert.ok(cf.comments[0]._id);
        assert.ok(cf.comments[1]._id);
        assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
        assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

        const update = {
          title: newTitle, // becomes $set
          $inc: { 'meta.visitors': 2 },
          $set: { date: new Date() },
          published: false, // becomes $set
          mixed: { x: 'ECKS', y: 'why' }, // $set
          $pullAll: { numbers: [4, 6] },
          $pull: { owners: id0 },
          'comments.1.body': 8 // $set
        };

        M.findOneAndUpdate({ title: title }, update, { new: true }, function(err, up) {
          assert.equal(err && err.stack, err, null);

          assert.equal(up.title, newTitle);
          assert.equal(up.author, author);
          assert.equal(up.meta.visitors.valueOf(), 2);
          assert.equal(up.date.toString(), update.$set.date.toString());
          assert.equal(up.published, false);
          assert.equal(up.mixed.x, 'ECKS');
          assert.equal(up.mixed.y, 'why');
          assert.deepEqual([5, 7], up.numbers.toObject());
          assert.equal(up.owners.length, 1);
          assert.equal(up.owners[0].toString(), id1.toString());
          assert.equal(up.comments[0].body, 'been there');
          assert.equal(up.comments[1].body, '8');
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);
          done();
        });
      });
    });
  });

  describe('will correctly', function() {
    let ItemParentModel, ItemChildModel;

    beforeEach(function() {
      const itemSpec = new Schema({
        item_id: {
          type: ObjectId, required: true, default: function() {
            return new DocumentObjectId();
          }
        },
        address: {
          street: String,
          zipcode: String
        },
        age: Number
      }, { _id: false });
      const itemSchema = new Schema({
        items: [itemSpec]
      });
      ItemParentModel = db.model('Test1', itemSchema);
      ItemChildModel = db.model('Test2', itemSpec);
    });

    it('update subdocument in array item', function(done) {
      const item1 = new ItemChildModel({
        address: {
          street: 'times square',
          zipcode: '10036'
        }
      });
      const item2 = new ItemChildModel({
        address: {
          street: 'bryant park',
          zipcode: '10030'
        }
      });
      const item3 = new ItemChildModel({
        address: {
          street: 'queens',
          zipcode: '1002?'
        }
      });
      const itemParent = new ItemParentModel({ items: [item1, item2, item3] });
      itemParent.save(function(err) {
        assert.ifError(err);
        ItemParentModel.findOneAndUpdate(
          { _id: itemParent._id, 'items.item_id': item1.item_id },
          { $set: { 'items.$.address': {} } },
          { new: true },
          function(err, updatedDoc) {
            assert.ifError(err);
            assert.ok(updatedDoc.items);
            assert.ok(updatedDoc.items instanceof Array);
            assert.ok(updatedDoc.items.length, 3);
            assert.ok(Utils.isObject(updatedDoc.items[0].address));
            assert.ok(Object.keys(updatedDoc.items[0].address).length, 0);
            done();
          }
        );
      });
    });
  });

  it('returns the original document', function(done) {
    const M = BlogPost;
    const title = 'Tobi ' + random();
    const author = 'Brian ' + random();
    const newTitle = 'Woot ' + random();
    const id0 = new DocumentObjectId();
    const id1 = new DocumentObjectId();

    const post = new M();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function(err) {
      assert.ifError(err);
      M.findById(post._id, function(err) {
        assert.ifError(err);

        const update = {
          title: newTitle, // becomes $set
          $inc: { 'meta.visitors': 2 },
          $set: { date: new Date() },
          published: false, // becomes $set
          mixed: { x: 'ECKS', y: 'why' }, // $set
          $pullAll: { numbers: [4, 6] },
          $pull: { owners: id0 },
          'comments.1.body': 8 // $set
        };

        M.findOneAndUpdate({ title: title }, update, { new: false }, function(err, up) {
          assert.ifError(err);

          assert.equal(up.title, post.title);
          assert.equal(up.author, post.author);
          assert.equal(up.meta.visitors.valueOf(), post.meta.visitors);
          assert.equal(post.date.toString(), up.date.toString());
          assert.equal(post.published, up.published);
          assert.equal(post.mixed.x, up.mixed.x);
          assert.equal(post.mixed.y, up.mixed.y);
          assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
          assert.equal(post.owners.length, up.owners.length);
          assert.equal(post.owners[0].toString(), up.owners[0].toString());
          assert.equal(post.comments[0].body, up.comments[0].body);
          assert.equal(post.comments[1].body, up.comments[1].body);
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);
          done();
        });
      });
    });
  });

  it('allows upserting', function(done) {
    const M = BlogPost;
    const title = 'Tobi ' + random();
    const author = 'Brian ' + random();
    const newTitle = 'Woot ' + random();
    const id0 = new DocumentObjectId();
    const id1 = new DocumentObjectId();

    const post = new M();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    const update = {
      title: newTitle, // becomes $set
      $inc: { 'meta.visitors': 2 },
      $set: { date: new Date() },
      published: false, // becomes $set
      mixed: { x: 'ECKS', y: 'why' }, // $set
      $pullAll: { numbers: [4, 6] },
      $pull: { owners: id0 }
    };

    M.findOneAndUpdate({ title: title }, update, { upsert: true, new: true }, function(err, up) {
      assert.ifError(err);

      assert.equal(up.title, newTitle);
      assert.equal(up.meta.visitors.valueOf(), 2);
      assert.equal(update.$set.date.toString(), up.date.toString());
      assert.equal(up.published, update.published);
      assert.deepEqual(update.mixed.x, up.mixed.x);
      assert.strictEqual(up.mixed.y, update.mixed.y);
      assert.ok(Array.isArray(up.numbers));
      assert.ok(Array.isArray(up.owners));
      assert.strictEqual(0, up.numbers.length);
      assert.strictEqual(0, up.owners.length);
      done();
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    const M = BlogPost;
    const now = new Date();
    let query;

    // Model.findOneAndUpdate
    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now } }, { new: false, fields: 'author' });
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(query._update.$set.date.toString(), now.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now } });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.$set.date.toString(), now.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ $set: { date: now } });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.$set.date.toString(), now.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update, undefined);
    assert.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndUpdate
    query = M.where('author', 'aaron').findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.date.toString(), now.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ author: 'aaron' }, { date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.date.toString(), now.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.date.toString(), now.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.find().findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update, undefined);
    assert.strictEqual(undefined, query._conditions.author);
    done();
  });

  it('executes when a callback is passed', function(done) {
    const M = BlogPost;
    let pending = 6;

    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron6' } }, { new: false }, cb);
    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron4' } }, cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron1' } }, { new: false }, cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron2' } }, cb);
    M.where().findOneAndUpdate({ $set: { name: 'Aaron6' } }, cb);
    M.where('name', 'aaron').findOneAndUpdate({ $set: { name: 'Aaron' } }).findOneAndUpdate(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) {
        return;
      }
      done();
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done) {
    const M = BlogPost;
    let pending = 6;

    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron' } }, { new: false }).exec(cb);
    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron' } }).exec(cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron' } }, { new: false }).exec(cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron' } }).exec(cb);
    M.where().findOneAndUpdate({ $set: { name: 'Aaron' } }).exec(cb);
    M.where('name', 'aaron').findOneAndUpdate({ $set: { name: 'Aaron' } }).exec(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) {
        return;
      }
      done();
    }
  });

  it('executing with only a callback throws', function(done) {
    const M = BlogPost;
    let err;

    try {
      M.findOneAndUpdate(function() {
      });
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('updates numbers atomically', function(done) {
    let totalDocs = 4;

    const post = new BlogPost();
    post.set('meta.visitors', 5);

    post.save(function(err) {
      assert.ifError(err);

      function callback(err) {
        assert.ifError(err);
        --totalDocs || complete();
      }

      for (let i = 0; i < 4; ++i) {
        BlogPost
          .findOneAndUpdate({ _id: post._id }, { $inc: { 'meta.visitors': 1 } }, callback);
      }

      function complete() {
        BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.get('meta.visitors'), 9);
          done();
        });
      }
    });
  });

  it('honors strict schemas', async function() {
    const S = db.model('Test', Schema({ name: String }, { strict: true }));
    const s = new S({ name: 'orange crush' });

    await s.save();

    const name = Date.now();
    const doc = await S.findOneAndUpdate({ name: name }, { ignore: true }, { upsert: true, new: true });

    assert.ok(doc);
    assert.ok(doc._id);
    assert.equal(doc.ignore, undefined);
    assert.equal(doc._doc.ignore, undefined);
    assert.equal(doc.name, name);
    const doc2 = await S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true }, { upsert: true });

    assert.ok(!doc2.ignore);
    assert.ok(!doc2._doc.ignore);
    assert.equal(doc2.name, 'orange crush');
    const doc3 = await S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true });

    assert.ok(!doc3.ignore);
    assert.ok(!doc3._doc.ignore);
    assert.equal(doc3.name, 'orange crush');
  });

  it('returns errors with strict:throw schemas', async function() {
    const S = db.model('Test', Schema({ name: String }, { strict: 'throw' }));
    const s = new S({ name: 'orange crush' });

    await s.save();


    const name = Date.now();

    const err = await S.findOneAndUpdate({ name: name }, { ignore: true }, { upsert: true }).then(() => null, err => err);

    assert.ok(err);
    assert.ok(/not in schema/.test(err));

    const err2 = await S.findOneAndUpdate({ _id: s._id }, { ignore: true }).then(() => null, err => err);

    assert.ok(err2);
    assert.ok(/not in schema/.test(err2));
  });

  it('executing with just a callback throws', function() {
    const M = BlogPost;
    let err;

    try {
      M.findByIdAndUpdate(function() {});
    } catch (e) {
      err = e;
    }

    assert.ok(/First argument must not be a function/.test(err));
  });

  it('executes when a callback is passed', function(done) {
    const M = BlogPost;
    const _id = new DocumentObjectId();
    let pending = 2;

    M.findByIdAndUpdate(_id, { $set: { name: 'Aaron' } }, { new: false }, cb);
    M.findByIdAndUpdate(_id, { $set: { name: 'changed' } }, cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) {
        return;
      }
      done();
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done) {
    const M = BlogPost;
    const _id = new DocumentObjectId();
    let pending = 2;

    M.findByIdAndUpdate(_id, { $set: { name: 'Aaron' } }, { new: false }).exec(cb);
    M.findByIdAndUpdate(_id, { $set: { name: 'changed' } }).exec(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) {
        return;
      }
      done();
    }
  });

  it('returns the original document', async function() {
    const M = BlogPost;
    const title = 'Tobi ' + random();
    const author = 'Brian ' + random();
    const newTitle = 'Woot ' + random();
    const id0 = new DocumentObjectId();
    const id1 = new DocumentObjectId();

    const post = new M();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    await post.save();

    await M.findById(post._id);

    const update = {
      title: newTitle, // becomes $set
      $inc: { 'meta.visitors': 2 },
      $set: { date: new Date() },
      published: false, // becomes $set
      mixed: { x: 'ECKS', y: 'why' }, // $set
      $pullAll: { numbers: [4, 6] },
      $pull: { owners: id0 },
      'comments.1.body': 8 // $set
    };

    const up = await M.findByIdAndUpdate(post.id, update, { new: false });


    assert.equal(post.title, up.title);
    assert.equal(post.author, up.author);
    assert.equal(post.meta.visitors, up.meta.visitors.valueOf());
    assert.equal(post.date.toString(), up.date.toString());
    assert.equal(post.published, up.published);
    assert.equal(post.mixed.x, up.mixed.x);
    assert.strictEqual(up.mixed.y, post.mixed.y);
    assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
    assert.equal(post.owners.length, up.owners.length);
    assert.equal(post.owners[0].toString(), up.owners[0].toString());
    assert.equal(post.comments[0].body, up.comments[0].body);
    assert.equal(post.comments[1].body, up.comments[1].body);
    assert.ok(up.comments[0]._id);
    assert.ok(up.comments[1]._id);
    assert.ok(up.comments[0]._id instanceof DocumentObjectId);
    assert.ok(up.comments[1]._id instanceof DocumentObjectId);
  });

  it('options/conditions/doc are merged when no callback is passed', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    const now = new Date();
    let query;

    // Model.findByIdAndUpdate
    query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { new: false, fields: 'author' });
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(query._update.$set.date.toString(), now.toString());
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id, { $set: { date: now } });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update.$set.date.toString(), now.toString());
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id);
    assert.strictEqual(undefined, query.options.new);
    assert.strictEqual(_id, query._conditions._id);

    query = M.findByIdAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(query._update, undefined);
    assert.strictEqual(undefined, query._conditions._id);
  });

  it('supports v3 select string syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    const now = new Date();
    let query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, { $set: { date: now } }, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 select object syntax', function() {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    const now = new Date();
    let query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, { $set: { date: now } }, { select: { author: 1, title: 0 } });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  });

  it('supports v3 sort string syntax', async function() {
    const M = BlogPost;

    const now = new Date();
    const _id = new DocumentObjectId();
    let query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndUpdate({}, { $set: { date: now } }, { sort: 'author -title' });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    // gh-1887
    await M.create(
      { title: 1, meta: { visitors: 0 } },
      { title: 2, meta: { visitors: 10 } },
      { title: 3, meta: { visitors: 5 } }
    );

    const doc = await M.findOneAndUpdate({}, { title: 'changed' })
      .sort({ 'meta.visitors': -1 })
      .exec();
    assert.equal(doc.meta.visitors, 10);
  });

  it('supports v3 sort object syntax', function(done) {
    const M = BlogPost;
    const _id = new DocumentObjectId();

    const now = new Date();
    let query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now } }, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    query = M.findOneAndUpdate(_id, { $set: { date: now } }, { sort: { author: 1, title: -1 } });
    assert.equal(Object.keys(query.options.sort).length, 2);
    assert.equal(query.options.sort.author, 1);
    assert.equal(query.options.sort.title, -1);

    done();
  });

  it('supports $elemMatch with $in (gh-1091 gh-1100)', function(done) {
    const postSchema = new Schema({
      ids: [{ type: Schema.ObjectId }],
      title: String
    });

    db.deleteModel(/BlogPost/);
    const B = db.model('BlogPost', postSchema);
    const _id1 = new mongoose.Types.ObjectId();
    const _id2 = new mongoose.Types.ObjectId();

    B.create({ ids: [_id1, _id2] }, function(err, doc) {
      assert.ifError(err);

      B
        .findByIdAndUpdate(doc._id, { title: 'woot' }, { new: true })
        .select({ title: 1, ids: { $elemMatch: { $in: [_id2.toString()] } } })
        .exec(function(err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(doc.id, found.id);
          assert.equal(found.title, 'woot');
          assert.equal(found.ids.length, 1);
          assert.equal(found.ids[0].toString(), _id2.toString());
          done();
        });
    });
  });

  it('supports population (gh-1395)', function(done) {
    const M = db.model('Test1', { name: String });
    const N = db.model('Test2', { a: { type: Schema.ObjectId, ref: 'Test1' }, i: Number });

    M.create({ name: 'i am an A' }, function(err, a) {
      if (err) {
        return done(err);
      }
      N.create({ a: a._id, i: 10 }, function(err, b) {
        if (err) {
          return done(err);
        }

        N.findOneAndUpdate({ _id: b._id }, { $inc: { i: 1 } })
          .populate('a')
          .exec(function(err, doc) {
            if (err) {
              return done(err);
            }
            assert.ok(doc);
            assert.ok(doc.a);
            assert.equal('i am an A', doc.a.name);
            done();
          });
      });
    });
  });
  it('returns null when doing an upsert & new=false gh-1533', function(done) {
    const thingSchema = new Schema({
      _id: String,
      flag: {
        type: Boolean,
        default: false
      }
    });

    const Thing = db.model('Test', thingSchema);
    const key = 'some-id';

    Thing.findOneAndUpdate({ _id: key }, { $set: { flag: false } }, { upsert: true, new: false }).exec(function(err, thing) {
      assert.ifError(err);
      assert.equal(thing, null);
      Thing.findOneAndUpdate({ _id: key }, { $set: { flag: false } }, { upsert: true, new: false }).exec(function(err, thing2) {
        assert.ifError(err);
        assert.equal(thing2.id, key);
        assert.equal(thing2.flag, false);
        done();
      });
    });
  });
  it('return hydrated document (gh-7734 gh-7735)', async function() {
    const fruitSchema = new Schema({
      name: { type: String }
    });

    const Fruit = db.model('Test', fruitSchema);

    let fruit = await Fruit.create({ name: 'Apple' });

    fruit = await Fruit.findOneAndUpdate({}, { $set: { name: 'Banana' } },
      { new: true });
    assert.ok(fruit instanceof mongoose.Document);

    fruit = await Fruit.findOneAndUpdate({}, { $set: { name: 'Cherry' } },
      { new: true });
    assert.ok(fruit instanceof mongoose.Document);
  });
  it('return rawResult when doing an upsert & new=false gh-7770', function(done) {
    const thingSchema = new Schema({
      _id: String,
      flag: {
        type: Boolean,
        default: false
      }
    });

    const Thing = db.model('Test', thingSchema);
    const key = 'some-new-id';

    Thing.findOneAndUpdate({ _id: key }, { $set: { flag: false } }, { upsert: true, new: false, rawResult: true }).exec(function(err, rawResult) {
      assert.ifError(err);
      assert.equal(rawResult.lastErrorObject.updatedExisting, false);
      Thing.findOneAndUpdate({ _id: key }, { $set: { flag: true } }, { upsert: true, new: false, rawResult: true }).exec(function(err, rawResult2) {
        assert.ifError(err);
        assert.equal(rawResult2.lastErrorObject.updatedExisting, true);
        assert.equal(rawResult2.value._id, key);
        assert.equal(rawResult2.value.flag, false);
        done();
      });
    });
  });

  it('allows properties to be set to null gh-1643', function(done) {
    const testSchema = new Schema({
      name: [String]
    });

    const Test = db.model('Test', testSchema);

    Test.create({ name: ['Test'] }, function(err, thing) {
      if (err) {
        return done(err);
      }
      Test.findOneAndUpdate({ _id: thing._id }, { name: null }, { new: true })
        .exec(function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.ok(doc);
          assert.equal(null, doc.name);
          done();
        });
    });
  });

  it('honors the overwrite option (gh-1809)', function(done) {
    const M = db.model('Test', { name: String, change: Boolean });
    M.create({ name: 'first' }, function(err, doc) {
      if (err) {
        return done(err);
      }
      M.findByIdAndUpdate(doc._id, { change: true }, { overwrite: true, new: true }, function(err, doc) {
        if (err) {
          return done(err);
        }
        assert.ok(doc.change);
        assert.equal(doc.name, undefined);
        done();
      });
    });
  });

  it('can do various deep equal checks (lodash.isEqual, lodash.isEqualWith, assert.deepEqual, utils.deepEqual) on object id after findOneAndUpdate (gh-2070)', function(done) {
    const userSchema = new Schema({
      name: String,
      contacts: [{
        account: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String
      }]
    });

    const User = db.model('User', userSchema);

    const a1 = new User({ name: 'parent' });
    const a2 = new User({ name: 'child' });

    a1.save(function(error) {
      assert.ifError(error);
      a2.save(function(error, a2) {
        assert.ifError(error);
        User.findOneAndUpdate(
          { name: 'parent' },
          { $push: { contacts: { account: a2._id, name: 'child' } } },
          { new: true },
          function(error, doc) {
            assert.ifError(error);
            assert.deepEqual(doc.contacts[0].account, a2._id);
            assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
            assert.ok(isEqualWith(doc.contacts[0].account, a2._id, compareBuffers));
            // Re: commends on https://github.com/mongodb/js-bson/commit/aa0b54597a0af28cce3530d2144af708e4b66bf0
            // Deep equality checks no longer work as expected with node 0.10.
            // Please file an issue if this is a problem for you
            assert.ok(isEqual(doc.contacts[0].account, a2._id));

            User.findOne({ name: 'parent' }, function(error, doc) {
              assert.ifError(error);
              assert.deepEqual(doc.contacts[0].account, a2._id);
              assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
              assert.ok(isEqualWith(doc.contacts[0].account, a2._id, compareBuffers));
              assert.ok(isEqual(doc.contacts[0].account, a2._id));
              done();
            });
          });
      });
    });

    function compareBuffers(a, b) {
      if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) {
        return a.toString('hex') === b.toString('hex');
      }
    }
  });

  it('adds __v on upsert (gh-2122) (gh-4505)', function(done) {
    const accountSchema = new Schema({
      name: String
    });

    const Account = db.model('Test', accountSchema);

    Account.findOneAndUpdate(
      { name: 'account' },
      { name: 'test' },
      { upsert: true, new: true },
      function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.__v, 0);
        Account.replaceOne({ name: 'test' }, { name: 'test' }, { upsert: true }, function(error) {
          assert.ifError(error);
          Account.findOne({ name: 'test' }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.__v, 0);
            done();
          });
        });
      });
  });

  it('doesn\'t add __v on upsert if `$set` (gh-4505) (gh-5973)', function() {
    const accountSchema = new Schema({
      name: String
    });

    const Account = db.model('Test', accountSchema);

    const update = { $set: { name: 'test', __v: 1 } };
    return Account.
      findOneAndUpdate({}, update, { upsert: true, new: true }).
      then(() => Account.findOne({ name: 'test' })).
      then(doc => assert.strictEqual(doc.__v, 1));
  });

  it('doesn\'t add __v on upsert if `$set` with `update()` (gh-5973)', function() {
    const accountSchema = new Schema({
      name: String
    });

    const Account = db.model('Test', accountSchema);

    const update = { $set: { name: 'test', __v: 1 } };
    return Account.
      updateOne({}, update, { upsert: true, new: true }).
      then(() => Account.findOne({ name: 'test' })).
      then(doc => assert.strictEqual(doc.__v, 1));
  });

  it('works with nested schemas and $pull+$or (gh-1932)', function(done) {
    const TickSchema = new Schema({ name: String });
    const TestSchema = new Schema({ a: Number, b: Number, ticks: [TickSchema] });

    const TestModel = db.model('Test', TestSchema);

    TestModel.create({ a: 1, b: 0, ticks: [{ name: 'eggs' }, { name: 'bacon' }, { name: 'coffee' }] }, function(error) {
      assert.ifError(error);
      TestModel.findOneAndUpdate({ a: 1 }, { $pull: { ticks: { $or: [{ name: 'eggs' }, { name: 'bacon' }] } } },
        function(error) {
          assert.ifError(error);
          TestModel.findOne({}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.ticks.length, 1);
            assert.equal(doc.ticks[0].name, 'coffee');
            done();
          });
        });
    });
  });

  it('accepts undefined', function(done) {
    const s = new Schema({
      time: Date,
      base: String
    });

    const Breakfast = db.model('Test', s);

    Breakfast.
      findOneAndUpdate({}, { time: undefined, base: undefined }, {}).
      exec(function(error) {
        assert.ifError(error);
        done();
      });
  });

  it('cast errors for empty objects as object ids (gh-2732)', function(done) {
    const s = new Schema({
      base: ObjectId
    });

    const Breakfast = db.model('Test', s);

    Breakfast.
      findOneAndUpdate({}, { base: {} }, {}).
      exec(function(error) {
        assert.ok(error);
        done();
      });
  });

  it('strict mode with objects (gh-2947)', function(done) {
    const s = new Schema({
      test: String
    }, { strict: true });

    const Breakfast = db.model('Test', s);
    const q = Breakfast.findOneAndUpdate({},
      { notInSchema: { a: 1 }, test: 'abc' },
      { new: true, strict: true, upsert: true });

    q.lean();
    q.exec(function(error, doc) {
      assert.ok(!doc.notInSchema);
      done();
    });
  });

  describe('middleware', function() {
    it('works', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndUpdate', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndUpdate', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);

      Breakfast.findOneAndUpdate(
        {},
        { base: 'eggs' },
        {},
        function(error) {
          assert.ifError(error);
          assert.equal(preCount, 1);
          assert.equal(postCount, 1);
          done();
        });
    });

    it('works with exec()', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });

      let preCount = 0;
      s.pre('findOneAndUpdate', function() {
        ++preCount;
      });

      let postCount = 0;
      s.post('findOneAndUpdate', function() {
        ++postCount;
      });

      const Breakfast = db.model('Test', s);

      Breakfast.
        findOneAndUpdate({}, { base: 'eggs' }, {}).
        exec(function(error) {
          assert.ifError(error);
          assert.equal(preCount, 1);
          assert.equal(postCount, 1);
          done();
        });
    });
  });

  describe('validators (gh-860)', function() {
    it('applies defaults on upsert', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true, new: true };
      Breakfast.findOneAndUpdate(
        {},
        { base: 'eggs' },
        updateOptions,
        function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          Breakfast.countDocuments({ topping: 'bacon' }, function(error, count) {
            assert.ifError(error);
            assert.equal(1, count);
            done();
          });
        });
    });

    it('doesnt set default on upsert if query sets it', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        numEggs: { type: Number, default: 3 },
        base: String
      }, { versionKey: null });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true, new: true };
      Breakfast.findOneAndUpdate(
        { topping: 'sausage', numEggs: 4 },
        { base: 'eggs' },
        updateOptions,
        function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'sausage');
          assert.equal(breakfast.numEggs, 4);
          done();
        });
    });

    it('properly sets default on upsert if query wont set it', function(done) {
      const s = new Schema({
        topping: { type: String, default: 'bacon' },
        base: String
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true, new: true };
      Breakfast.findOneAndUpdate(
        { topping: { $ne: 'sausage' } },
        { base: 'eggs' },
        updateOptions,
        function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          Breakfast.countDocuments({ topping: 'bacon' }, function(error, count) {
            assert.ifError(error);
            assert.equal(1, count);
            done();
          });
        });
    });

    it('skips setting defaults within maps (gh-7909)', async function() {
      const socialMediaHandleSchema = Schema({ links: [String] });
      const profileSchema = Schema({
        username: String,
        socialMediaHandles: {
          type: Map,
          of: socialMediaHandleSchema
        }
      });

      const Profile = db.model('Test', profileSchema);


      const update = { $setOnInsert: { username: 'test' } };
      const opts = { upsert: true, new: true };
      const doc = await Profile.findOneAndUpdate({}, update, opts);
      assert.equal(doc.socialMediaHandles, undefined);
    });

    it('runs validators if theyre set', function(done) {
      const s = new Schema({
        topping: {
          type: String,
          validate: function() {
            return false;
          }
        },
        base: {
          type: String,
          validate: function() {
            return true;
          }
        }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = {
        upsert: true,
        runValidators: true,
        new: true
      };
      Breakfast.findOneAndUpdate(
        {},
        { topping: 'bacon', base: 'eggs' },
        updateOptions,
        function(error, breakfast) {
          assert.ok(!!error);
          assert.ok(!breakfast);
          assert.equal(Object.keys(error.errors).length, 1);
          assert.equal(Object.keys(error.errors)[0], 'topping');
          assert.equal(error.errors.topping.message, 'Validator failed for path `topping` with value `bacon`');

          assert.ok(!breakfast);
          done();
        });
    });

    it('validators handle $unset and $setOnInsert', function(done) {
      const s = new Schema({
        steak: { type: String, required: true },
        eggs: {
          type: String, validate: function() {
            return false;
          }
        }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true, new: true };
      Breakfast.findOneAndUpdate(
        {},
        { $unset: { steak: '' }, $setOnInsert: { eggs: 'softboiled' } },
        updateOptions,
        function(error, breakfast) {
          assert.ok(!!error);
          assert.ok(!breakfast);
          assert.equal(Object.keys(error.errors).length, 2);
          assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
          assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
          assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
          assert.equal(error.errors.steak.message, 'Path `steak` is required.');
          done();
        });
    });

    it('min/max, enum, and regex built-in validators work', function(done) {
      const s = new Schema({
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true, new: true };
      Breakfast.findOneAndUpdate(
        {},
        { $set: { steak: 'ribeye', eggs: 3, bacon: '3 strips' } },
        updateOptions,
        function(error) {
          assert.ok(!!error);
          assert.equal(Object.keys(error.errors).length, 1);
          assert.equal(Object.keys(error.errors)[0], 'eggs');
          assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

          Breakfast.findOneAndUpdate(
            {},
            { $set: { steak: 'tofu', eggs: 5, bacon: '3 strips' } },
            updateOptions,
            function(error) {
              assert.ok(!!error);
              assert.equal(Object.keys(error.errors).length, 1);
              assert.equal(Object.keys(error.errors)[0], 'steak');
              assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

              Breakfast.findOneAndUpdate(
                {},
                { $set: { steak: 'sirloin', eggs: 6, bacon: 'none' } },
                updateOptions,
                function(error) {
                  assert.ok(!!error);
                  assert.equal(Object.keys(error.errors).length, 1);
                  assert.equal(Object.keys(error.errors)[0], 'bacon');
                  assert.equal(error.errors.bacon.message, 'Path `bacon` is invalid (none).');

                  done();
                });
            });
        });
    });

    it('multiple validation errors', function(done) {
      const s = new Schema({
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true, new: true };
      Breakfast.findOneAndUpdate(
        {},
        { $set: { steak: 'tofu', eggs: 2, bacon: '3 strips' } },
        updateOptions,
        function(error, breakfast) {
          assert.ok(!!error);
          assert.equal(Object.keys(error.errors).length, 2);
          assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
          assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
          assert.ok(!breakfast);
          done();
        });
    });

    it('validators ignore $inc', function(done) {
      const s = new Schema({
        steak: { type: String, required: true },
        eggs: { type: Number, min: 4 }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true, upsert: true, new: true };
      Breakfast.findOneAndUpdate(
        {},
        { $inc: { eggs: 1 } },
        updateOptions,
        function(error, breakfast) {
          assert.ifError(error);
          assert.ok(!!breakfast);
          assert.equal(breakfast.eggs, 1);
          done();
        });
    });

    it('validators ignore paths underneath mixed (gh-8659)', function() {
      let called = 0;
      const s = new Schema({
        n: {
          type: 'Mixed',
          validate: () => { ++called; return false; }
        }
      });
      const Test = db.model('Test', s);

      const updateOptions = { runValidators: true, upsert: true, new: true };
      return Test.findOneAndUpdate({}, { 'n.test': 'foo' }, updateOptions).
        then(() => assert.equal(called, 0));
    });

    it('should work with arrays (gh-3035)', function(done) {
      const testSchema = new mongoose.Schema({
        id: String,
        name: String,
        a: [String],
        _createdAt: {
          type: Number,
          default: Date.now
        }
      });

      const TestModel = db.model('Test', testSchema);
      TestModel.create({ id: '1' }, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({ id: '1' }, { $set: { name: 'Joe' } }, { upsert: true },
          function(error) {
            assert.ifError(error);
            done();
          });
      });
    });

    it('should allow null values in query (gh-3135)', function(done) {
      const testSchema = new mongoose.Schema({
        id: String,
        blob: ObjectId,
        status: String
      });

      const TestModel = db.model('Test', testSchema);
      TestModel.create({ blob: null, status: 'active' }, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({ id: '1', blob: null }, { $set: { status: 'inactive' } }, { upsert: true },
          function(error) {
            assert.ifError(error);
            done();
          });
      });
    });

    it('should work with array documents (gh-3034)', function(done) {
      const testSchema = new mongoose.Schema({
        id: String,
        name: String,
        a: [{
          foo: String
        }],
        _createdAt: {
          type: Number,
          default: Date.now
        }
      });

      const TestModel = db.model('Test', testSchema);
      TestModel.create({ id: '1' }, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({ id: '1' }, { $set: { name: 'Joe' } }, { upsert: true },
          function(error) {
            assert.ifError(error);
            done();
          });
      });
    });

    it('handles setting array (gh-3107)', function(done) {
      const testSchema = new mongoose.Schema({
        name: String,
        a: [{
          foo: String
        }],
        b: [Number]
      });

      const TestModel = db.model('Test', testSchema);
      const update = { $setOnInsert: { a: [{ foo: 'bar' }], b: [2] } };
      const opts = { upsert: true, new: true };
      TestModel
        .findOneAndUpdate({ name: 'abc' }, update, opts,
          function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.a.length, 1);
            assert.equal(doc.a[0].foo, 'bar');
            assert.equal(doc.b.length, 1);
            assert.equal(doc.b[0], 2);
            done();
          });
    });


    it('handles nested cast errors (gh-3468)', function(done) {
      const recordSchema = new mongoose.Schema({
        kind: String,
        amount: Number
      }, {
        _id: false
      });

      const shiftSchema = new mongoose.Schema({
        userId: String,
        records: [recordSchema]
      });

      const Shift = db.model('Test', shiftSchema);

      Shift.create({
        userId: 'tom',
        records: []
      }, function(error) {
        assert.ifError(error);
        Shift.findOneAndUpdate({ userId: 'tom' }, {
          records: [{ kind: 'kind1', amount: NaN }]
        }, {
          new: true
        }, function(error) {
          assert.ok(error);
          assert.ok(error instanceof CastError);
          done();
        });
      });
    });

    it('cast errors with nested schemas (gh-3580)', function(done) {
      const nested = new Schema({ num: Number });
      const s = new Schema({ nested: nested });

      const MyModel = db.model('Test', s);

      const update = { nested: { num: 'Not a Number' } };
      MyModel.findOneAndUpdate({}, update, function(error) {
        assert.ok(error);
        done();
      });
    });

    it('pull with nested schemas (gh-3616)', function(done) {
      const nested = new Schema({ arr: [{ num: Number }] });
      const s = new Schema({ nested: nested });

      const MyModel = db.model('Test', s);

      MyModel.create({ nested: { arr: [{ num: 5 }] } }, function(error) {
        assert.ifError(error);
        const update = { $pull: { 'nested.arr': { num: 5 } } };
        const options = { new: true };
        MyModel.findOneAndUpdate({}, update, options, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.nested.arr.length, 0);
          done();
        });
      });
    });

    it('setting nested schema (gh-3889)', function(done) {
      const nested = new Schema({ test: String });
      const s = new Schema({ nested: nested });
      const MyModel = db.model('Test', s);
      MyModel.findOneAndUpdate(
        {},
        { $set: { nested: { test: 'abc' } } },
        function(error) {
          assert.ifError(error);
          done();
        });
    });
  });

  describe('bug fixes', function() {
    it('passes raw result if rawResult specified (gh-4925)', function(done) {
      const testSchema = new mongoose.Schema({
        test: String
      });

      const TestModel = db.model('Test', testSchema);
      const options = { upsert: true, new: true, rawResult: true };
      const update = { $set: { test: 'abc' } };

      TestModel.findOneAndUpdate({}, update, options).
        exec(function(error, res) {
          assert.ifError(error);
          assert.ok(res);
          assert.ok(res.ok);
          assert.equal(res.value.test, 'abc');
          assert.ok(res.value.id);
          assert.equal(res.lastErrorObject.n, 1);
          done();
        });
    });

    it('handles setting single embedded docs to null (gh-4281)', function(done) {
      const foodSchema = new mongoose.Schema({
        name: { type: String, default: 'Bacon' }
      });

      const breakfastSchema = new mongoose.Schema({
        main: foodSchema,
        for: String
      });

      const TestModel = db.model('Test', breakfastSchema);
      const options = { upsert: true, new: true };
      const update = { $set: { main: null, for: 'Val' } };

      TestModel.findOneAndUpdate({}, update, options).
        exec(function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          assert.equal(doc.main, null);

          done();
        });
    });

    it('custom validator on mixed field (gh-4305)', function(done) {
      let called = 0;

      const boardSchema = new Schema({
        name: {
          type: String,
          required: true
        },
        structure: {
          type: Schema.Types.Mixed,
          required: true,
          validate: {
            validator: function() {
              ++called;
              return true;
            },
            message: 'The structure of the board is invalid'
          }
        }
      });
      const Board = db.model('Test', boardSchema);

      const update = {
        structure: [
          {
            capacity: 0,
            size: 0,
            category: 0,
            isColumn: true,
            title: 'Backlog'
          }
        ]
      };
      const opts = {
        new: true,
        upsert: false,
        passRawResult: false,
        overwrite: false,
        runValidators: true
      };
      Board.
        findOneAndUpdate({}, update, opts).
        exec(function(error) {
          assert.ifError(error);
          assert.equal(called, 1);
          done();
        });
    });

    it('single nested doc cast errors (gh-3602)', function(done) {
      const AddressSchema = new Schema({
        street: {
          type: Number
        }
      });

      const PersonSchema = new Schema({
        addresses: [AddressSchema]
      });

      const Person = db.model('Person', PersonSchema);

      const update = { $push: { addresses: { street: 'not a num' } } };
      Person.findOneAndUpdate({}, update, function(error) {
        assert.ok(error.message.indexOf('street') !== -1);
        assert.equal(error.reason.message,
          'Cast to Number failed for value "not a num" (type string) at path "street"');
        done();
      });
    });

    it('projection option as alias for fields (gh-4315)', function(done) {
      const TestSchema = new Schema({
        test1: String,
        test2: String
      });
      const Test = db.model('Test', TestSchema);
      const update = { $set: { test1: 'a', test2: 'b' } };
      const options = { projection: { test2: 0 }, new: true, upsert: true };
      Test.findOneAndUpdate({}, update, options, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.test2);
        assert.equal(doc.test1, 'a');
        done();
      });
    });

    it('handles upserting a non-existing field (gh-4757)', function(done) {
      const modelSchema = new Schema({ field: Number }, { strict: 'throw' });

      const Model = db.model('Test', modelSchema);
      Model.findOneAndUpdate({ nonexistingField: 1 }, { field: 2 }, {
        upsert: true,
        new: true
      }).exec(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'StrictModeError');
        done();
      });
    });

    it('strict option (gh-5108)', function(done) {
      const modelSchema = new Schema({ field: Number }, { strict: 'throw' });

      const Model = db.model('Test', modelSchema);
      Model.findOneAndUpdate({}, { field: 2, otherField: 3 }, {
        upsert: true,
        strict: false,
        new: true
      }).exec(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.field, 2);
        assert.equal(doc.get('otherField'), 3);
        done();
      });
    });

    it('correct key order (gh-6484)', function() {
      const modelSchema = new Schema({
        nested: { field1: Number, field2: Number }
      });

      const Model = db.model('Test', modelSchema);
      const opts = { upsert: true, new: true };
      return Model.findOneAndUpdate({}, { nested: { field1: 1, field2: 2 } }, opts).exec().
        then(function() {
          return Model.collection.findOne();
        }).
        then(function(doc) {
          // Make sure order is correct
          assert.deepEqual(Object.keys(doc.nested), ['field1', 'field2']);
        });
    });

    it('should not apply schema transforms (gh-4574)', function(done) {
      const options = {
        toObject: {
          transform: function() {
            assert.ok(false, 'should not call transform');
          }
        }
      };

      const SubdocSchema = new Schema({ test: String }, options);

      const CollectionSchema = new Schema({
        field1: { type: String },
        field2: {
          arrayField: [SubdocSchema]
        }
      }, options);

      const Collection = db.model('Test', CollectionSchema);

      Collection.create({ field2: { arrayField: [] } }).
        then(function(doc) {
          return Collection.findByIdAndUpdate(doc._id, {
            $push: { 'field2.arrayField': { test: 'test' } }
          }, { new: true });
        }).
        then(function() {
          done();
        });
    });

    it('overwrite doc with update validators (gh-3556)', function(done) {
      const testSchema = new Schema({
        name: {
          type: String,
          required: true
        },
        otherName: String
      });
      const Test = db.model('Test', testSchema);

      const opts = { overwrite: true, runValidators: true };
      Test.findOneAndUpdate({}, { otherName: 'test' }, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['name']);
        Test.findOneAndUpdate({}, { $set: { otherName: 'test' } }, opts, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('update using $ (gh-5628)', function(done) {
      const schema = new mongoose.Schema({
        elems: [String]
      });

      const Model = db.model('Test', schema);
      Model.create({ elems: ['a', 'b'] }, function(error, doc) {
        assert.ifError(error);
        const query = { _id: doc._id, elems: 'a' };
        const update = { $set: { 'elems.$': 'c' } };
        Model.findOneAndUpdate(query, update, { new: true }, function(error) {
          assert.ifError(error);
          Model.collection.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.deepEqual(doc.elems, ['c', 'b']);
            done();
          });
        });
      });
    });

    it('projection with $elemMatch (gh-5661)', function(done) {
      const schema = new mongoose.Schema({
        name: { type: String, default: 'test' },
        arr: [{ tag: String }]
      });

      const Model = db.model('Test', schema);
      const doc = { arr: [{ tag: 't1' }, { tag: 't2' }] };
      Model.create(doc, function(error) {
        assert.ifError(error);
        const query = {};
        const update = { $set: { name: 'test2' } };
        const opts = {
          new: true,
          fields: { arr: { $elemMatch: { tag: 't1' } } }
        };
        Model.findOneAndUpdate(query, update, opts, function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc.name);
          assert.equal(doc.arr.length, 1);
          assert.equal(doc.arr[0].tag, 't1');
          done();
        });
      });
    });

    it('multi cast error (gh-5609)', function(done) {
      const schema = new mongoose.Schema({
        num1: Number,
        num2: Number
      });

      const Model = db.model('Test', schema);

      const opts = { multipleCastError: true };
      Model.findOneAndUpdate({}, { num1: 'fail', num2: 'fail' }, opts, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ValidationError');
        assert.ok(error.errors['num1']);
        assert.equal(error.errors['num1'].name, 'CastError');
        assert.ok(error.errors['num2']);
        assert.equal(error.errors['num2'].name, 'CastError');
        done();
      });
    });

    it('update validators with pushing null (gh-5710)', function(done) {
      const schema = new mongoose.Schema({
        arr: [String]
      });

      const Model = db.model('Test', schema);

      const update = { $addToSet: { arr: null } };
      const options = { runValidators: true };
      Model.findOneAndUpdate({}, update, options, function(error) {
        assert.ifError(error);
        done();
      });
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

      await Model.findOneAndUpdate({ foo: '123' }, { name: 'bar' });

      assert.deepEqual(calls, ['123']);
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
      const Model = db.model('User', userSchema);

      await Model.findOneAndUpdate({ foo: '123' }, { name: 'bar' });

      assert.deepEqual(calls, ['123']);
    });

    it('update validators with pull + $in (gh-6240)', async function() {
      const highlightSchema = new mongoose.Schema({
        _id: {
          type: String,
          required: true
        },
        color: {
          type: String,
          required: true
        },
        range: {
          start: {
            type: Number,
            required: true
          },
          end: {
            type: Number,
            required: true
          }
        }
      });

      const schema = new mongoose.Schema({
        _id: {
          type: String,
          required: true
        },
        highlights: [highlightSchema]
      });

      const Model = db.model('Test', schema);


      await Model.create({
        _id: '1',
        highlights: [{
          _id: '1',
          color: 'green',
          range: { start: 1, end: 2 }
        }]
      });

      // Should not throw
      const res = await Model.findByIdAndUpdate('1', {
        $pull: {
          highlights: {
            _id: {
              $in: ['1', '2', '3', '4']
            }
          }
        }
      }, { runValidators: true, new: true });

      assert.equal(res.highlights.length, 0);
    });

    it('avoids edge case with middleware cloning buffers (gh-5702)', function(done) {
      function toUUID(string) {
        if (!string) {
          return null;
        }
        if (Buffer.isBuffer(string) || Buffer.isBuffer(string.buffer)) {
          return string;
        }
        const buffer = uuid.parse(string);
        return new mongoose.Types.Buffer(buffer).toObject(0x04);
      }

      function fromUUID(buffer) {
        if (!buffer || buffer.length !== 16) {
          return null;
        }
        return uuid.stringify(buffer);
      }

      const UserSchema = new mongoose.Schema({
        name: String,
        lastUpdate: { type: Date },
        friends: [{
          _id: false,
          status: { type: String, required: true },
          id: {
            type: mongoose.Schema.Types.Buffer,
            get: fromUUID,
            set: toUUID
          }
        }]
      }, { collection: 'users' });

      UserSchema.pre('findOneAndUpdate', function() {
        this.update({}, { $set: { lastUpdate: new Date() } });
      });

      const User = db.model('User', UserSchema);

      const friendId = uuid.v4();
      const user = {
        name: 'Sean',
        friends: [{ status: 'New', id: friendId }]
      };

      User.create(user, function(error, user) {
        assert.ifError(error);

        const q = { _id: user._id, 'friends.id': friendId };
        const upd = { 'friends.$.status': 'Active' };
        User.findOneAndUpdate(q, upd, { new: true }).lean().exec(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('setting subtype when saving (gh-5551)', function(done) {
      const uuid = require('uuid');
      function toUUID(string) {
        if (!string) {
          return null;
        }
        if (Buffer.isBuffer(string) || Buffer.isBuffer(string.buffer)) {
          return string;
        }
        const buffer = uuid.parse(string);
        return new mongoose.Types.Buffer(buffer).toObject(0x04);
      }

      const UserSchema = new mongoose.Schema({
        name: String,
        foo: {
          type: mongoose.Schema.Types.Buffer,
          set: toUUID
        }
      });

      const User = db.model('User', UserSchema);

      const user = { name: 'upsert', foo: uuid.v4() };
      const opts = {
        upsert: true,
        new: true
      };
      User.findOneAndUpdate({}, user, opts).exec(function(error, doc) {
        assert.ifError(error);
        User.collection.findOne({ _id: doc._id }, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.foo.sub_type, 4);
          done();
        });
      });
    });

    it('properly handles casting nested objects in update (gh-4724)', function(done) {
      const locationSchema = new Schema({
        _id: false,
        location: {
          type: { type: String, default: 'Point' },
          coordinates: [Number]
        }
      });

      const testSchema = new Schema({
        locations: [locationSchema]
      });

      const T = db.model('Test', testSchema);

      const t = new T({
        locations: [{
          location: { type: 'Point', coordinates: [-122, 44] }
        }]
      });

      t.save().
        then(function(t) {
          return T.findByIdAndUpdate(t._id, {
            $set: {
              'locations.0': {
                location: { type: 'Point', coordinates: [-123, 45] }
              }
            }
          }, { new: true });
        }).
        then(function(res) {
          assert.equal(res.locations[0].location.coordinates[0], -123);
          done();
        }).
        catch(done);
    });

    it('doesnt do double validation on document arrays during updates (gh-4440)', function(done) {
      const A = new Schema({ str: String });
      let B = new Schema({ a: [A] });
      let validateCalls = 0;
      B.path('a').validate(function(val) {
        ++validateCalls;
        assert(Array.isArray(val));
        return true;
      });

      B = db.model('Test', B);

      B.findOneAndUpdate(
        { foo: 'bar' },
        { $set: { a: [{ str: 'asdf' }] } },
        { runValidators: true },
        function(err) {
          assert.ifError(err);
          assert.equal(validateCalls, 1); // Assertion error: 1 == 2
          done();
        }
      );
    });

    it('runs setters on array elements (gh-7679)', function() {
      const bookSchema = new Schema({
        genres: {
          type: [{
            type: String,
            lowercase: true
          }]
        }
      });

      const Book = db.model('Test', bookSchema);

      return Book.findOneAndUpdate({}, { genres: ['Sci-Fi'] }, { upsert: true }).
        then(() => Book.findOne()).
        then(doc => assert.equal(doc.genres[0], 'sci-fi'));
    });

    it('avoid calling $pull in doc array (gh-6971) (gh-6889)', function() {
      const schema = new Schema({
        arr: {
          type: [{ x: String }],
          validate: {
            validator: () => assert.ok(false)
          }
        }
      });

      const Model = db.model('Test', schema);

      const opts = { runValidators: true };
      return Model.findOneAndUpdate({}, { $pull: { arr: { x: 'three' } } }, opts);
    });

    it('$pull with `required` and runValidators (gh-6972)', async function() {
      const schema = new mongoose.Schema({
        someArray: {
          type: [{
            innerField: {
              type: mongoose.Schema.Types.ObjectId,
              required: true
            }
          }]
        }
      });


      const Model = db.model('Test', schema);
      await Model.findOneAndUpdate({}, {
        $pull: { someArray: { innerField: '507f191e810c19729de860ea' } }
      }, {
        runValidators: true
      });
    });
  });

  it('with versionKey in top-level and a `$` key (gh-7003)', async function() {
    const schema = new Schema({ name: String });
    const Model = db.model('Test', schema);


    let doc = await Model.create({ name: 'test', __v: 10 });
    await Model.findByIdAndUpdate(doc._id, {
      $unset: { name: '' },
      __v: 0
    }, { upsert: true });

    doc = await Model.findOne();
    assert.strictEqual(doc.__v, 0);
    assert.ok(!doc.name);
  });

  it('empty update with timestamps (gh-7041)', async function() {
    const schema = new Schema({ name: String }, { timestamps: true });
    const Model = db.model('Test', schema);


    let doc = await Model.create({ name: 'test' });
    // Should not throw
    doc = await Model.findOneAndUpdate({ _id: doc._id }, void 0, { new: true });
    assert.equal(doc.name, 'test');
  });

  it('skipping updatedAt and createdAt (gh-3934)', async function() {
    const schema = new Schema({ name: String }, { timestamps: true });
    const Model = db.model('Test', schema);


    let doc = await Model.findOneAndUpdate({}, { name: 'test' }, {
      upsert: true,
      new: true,
      timestamps: { createdAt: false }
    });
    assert.ok(!doc.createdAt);
    assert.ok(doc.updatedAt);
    const start = doc.updatedAt;
    doc = await Model.findOneAndUpdate({ _id: doc._id }, { name: 'test2' }, {
      new: true,
      timestamps: { updatedAt: false }
    });
    assert.equal(doc.updatedAt.valueOf(), start.valueOf());
  });

  it('runs lowercase on $addToSet, $push, etc (gh-4185)', async function() {
    const Cat = db.model('Test', {
      _id: String,
      myArr: { type: [{ type: String, lowercase: true }], default: undefined }
    });


    await Cat.create({ _id: 'test' });
    const res = await Cat.findOneAndUpdate({}, {
      $addToSet: { myArr: ['Case SenSiTive'] }
    }, { new: true });
    assert.equal(res.myArr[0], 'case sensitive');
  });

  it('returnOriginal (gh-7846)', async function() {
    const Cat = db.model('Cat', {
      name: String
    });


    await Cat.create({ name: 'test' });
    const res = await Cat.findOneAndUpdate({}, {
      name: 'test2'
    }, { returnOriginal: false });
    assert.equal(res.name, 'test2');
  });

  it('updating embedded discriminator with discriminator key in update (gh-8378)', async function() {
    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    schema.path('shape').discriminator('gh8378_Circle',
      Schema({ radius: String, color: String }));
    schema.path('shape').discriminator('gh8378_Square',
      Schema({ side: Number, color: String }));

    const MyModel = db.model('Test', schema);


    let doc = await MyModel.create({
      shape: {
        kind: 'gh8378_Circle',
        name: 'before',
        radius: 5,
        color: 'red'
      }
    });

    doc = await MyModel.findByIdAndUpdate(doc._id, {
      'shape.kind': 'gh8378_Circle',
      'shape.name': 'after',
      'shape.radius': 10
    }, { new: true });

    assert.equal(doc.shape.name, 'after');
    assert.equal(doc.shape.radius, 10);
  });

  it('setDefaultsOnInsert with doubly nested subdocs (gh-8392)', function() {
    const nestedSchema = Schema({ name: String });
    const Model = db.model('Test', Schema({
      L1: Schema({
        L2: {
          type: nestedSchema,
          default: () => ({ name: 'foo' })
        }
      }),
      prop: String
    }));

    const opts = { upsert: true, new: true };
    return Model.findOneAndUpdate({}, { prop: 'foo', L1: {} }, opts).lean().
      then(doc => assert.equal(doc.L1.L2.name, 'foo'));
  });

  it('calls setters on mixed type (gh-8444)', async function() {
    const userSchema = new Schema({
      jobCategory: {
        type: Object,
        set: () => {
          return {
            name: 'from setter 1',
            value: 'from setter 2'
          };
        }
      },
      num: {
        type: Number,
        set: () => 42
      }
    });

    const User = db.model('User', userSchema);


    const doc = await User.findOneAndUpdate({}, {
      num: 5,
      jobCategory: {
        name: 2,
        value: 2
      }
    }, { new: true, upsert: true }).lean();

    assert.equal(doc.num, 42);
    assert.equal(doc.jobCategory.name, 'from setter 1');
    assert.equal(doc.jobCategory.value, 'from setter 2');
  });

  it('returnDocument should work (gh-10321)', async function() {
    const testSchema = Schema({ a: Number });
    const Model = db.model('Test', testSchema);

    const opts = { returnDocument: 'after' };

    const tmp = await Model.create({ a: 1 });
    const doc = await Model.findOneAndUpdate({ _id: tmp._id }, { a: 2 }, opts).lean();
    assert.equal(doc.a, 2);
  });

  it('supports overwriting nested map paths (gh-10485)', async function() {
    const child = new mongoose.Schema({
      vals: {
        type: mongoose.Schema.Types.Map,
        of: String
      }
    });

    const parentSchema = new mongoose.Schema({
      children: {
        type: [child]
      }
    });
    const Parent = db.model('Parent', parentSchema);


    const parent = await Parent.create({
      children: [{ vals: { github: 'hello', twitter: 'world' } }]
    });

    const res = await Parent.findOneAndUpdate({ _id: parent._id, 'children.vals.github': { $exists: true } },
      { $set: { 'children.$.vals': { telegram: 'hello' } } }, { new: true });
    assert.deepEqual(res.toObject().children[0].vals, new Map([['telegram', 'hello']]));
  });

  it('supports $set on elements of map of subdocuments (gh-10720)', async function() {
    const parentSchema = new mongoose.Schema({
      data: new mongoose.Schema({
        children: {
          type: Map,
          of: new mongoose.Schema({ age: Number }, { _id: false })
        }
      }, { _id: false })
    });
    const Parent = db.model('Parent', parentSchema);
    const parent = new Parent({
      data: {
        children: {
          lisa: { age: 5 },
          john: { age: 7 }
        }
      }
    });
    await parent.save();
    const update = { $set: { 'data.children.kenny': { age: '1' } } };
    const res = await Parent.findOneAndUpdate({ _id: parent.id }, update, { new: true });
    assert.strictEqual(res.data.children.get('kenny').age, 1);
  });

  it('handles validating deeply nested subdocuments (gh-11394)', async function() {
    const userSchema = new Schema({
      myId: Number,
      address: {
        _id: false,
        type: {
          city: new Schema({ zipCode: new Schema({ value: Number }) })
        }
      }
    });

    const User = db.model('User', userSchema);

    const err = await User.findOneAndUpdate(
      { myId: 1 },
      { myId: 1, address: { city: { zipCode: { value: 1 } } } },
      { runValidators: true }
    ).then(() => null, err => err);

    assert.ifError(err);
  });
});
