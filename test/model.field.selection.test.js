/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model field selection', function() {
  let Comments;
  let BlogPostB;
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

    const BlogPostSchema = new Schema({
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
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: { type: String, default: 'kandinsky' }
    });


    BlogPostB = db.model('BlogPost', BlogPostSchema);
  });

  it('excluded fields should be undefined', async function() {
    const date = new Date();

    const doc = {
      title: 'subset 1',
      author: 'me',
      comments: [{ title: 'first comment', date: new Date() }, { title: '2nd', date: new Date() }],
      meta: { date: date }
    };

    const created = await BlogPostB.create(doc);
    const id = created.id;

    const found = await BlogPostB.findById(id, { title: 0, 'meta.date': 0, owners: 0, 'comments.user': 0 });
    assert.equal(found._id.toString(), created._id);
    assert.strictEqual(undefined, found.title);
    assert.strictEqual('kandinsky', found.def);
    assert.strictEqual('me', found.author);
    assert.strictEqual(true, Array.isArray(found.numbers));
    assert.equal(found.meta.date, undefined);
    assert.equal(found.numbers.length, 0);
    assert.equal(found.owners, undefined);
    assert.strictEqual(true, Array.isArray(found.comments));
    assert.equal(found.comments.length, 2);
    found.comments.forEach(function(comment) {
      assert.equal(comment.user, undefined);
    });
  });

  it('excluded fields should be undefined and defaults applied to other fields', async function() {
    const id = new DocumentObjectId();
    const date = new Date();

    await BlogPostB.collection.insertOne({ _id: id, title: 'hahaha1', meta: { date: date } });

    const found = await BlogPostB.findById(id, { title: 0 });
    assert.equal(found._id.toString(), id);
    assert.strictEqual(undefined, found.title);
    assert.strictEqual('kandinsky', found.def);
    assert.strictEqual(undefined, found.author);
    assert.strictEqual(true, Array.isArray(found.comments));
    assert.equal(date.toString(), found.meta.date.toString());
    assert.equal(found.comments.length, 0);
  });

  it('where subset of fields excludes _id', async function() {
    await BlogPostB.create({ title: 'subset 1' });
    const found = await BlogPostB.findOne({ title: 'subset 1' }, { title: 1, _id: 0 });
    assert.strictEqual(undefined, found._id);
    assert.equal(found.title, 'subset 1');
  });

  it('works with subset of fields, excluding _id', async function() {
    await BlogPostB.create({ title: 'subset 1', author: 'me' });
    const found = await BlogPostB.find({ title: 'subset 1' }, { title: 1, _id: 0 });
    assert.strictEqual(undefined, found[0]._id);
    assert.equal(found[0].title, 'subset 1');
    assert.strictEqual(undefined, found[0].def);
    assert.strictEqual(undefined, found[0].author);
    assert.strictEqual(false, Array.isArray(found[0].comments));
  });

  it('works with just _id and findOneAndUpdate (gh-3407)', async function() {
    const MyModel = db.model('Test', { test: { type: Number, default: 1 } });
    await MyModel.collection.insertOne({});
    const doc = await MyModel.findOne({}, { _id: 1 });
    assert.ok(!doc.test);
  });

  it('works with subset of fields excluding emebedded doc _id (gh-541)', async function() {
    const created = await BlogPostB.create({ title: 'LOTR', comments: [{ title: ':)' }] });
    const found = await BlogPostB.find({ _id: created }, { _id: 0, 'comments._id': 0 });
    assert.strictEqual(undefined, found[0]._id);
    assert.equal(found[0].title, 'LOTR');
    assert.strictEqual('kandinsky', found[0].def);
    assert.strictEqual(undefined, found[0].author);
    assert.strictEqual(true, Array.isArray(found[0].comments));
    assert.equal(found[0].comments.length, 1);
    assert.equal(found[0].comments[0].title, ':)');

    assert.strictEqual(undefined, found[0].comments[0]._id);
    // gh-590
    assert.ok(!found[0].comments[0].id);
  });

  it('included fields should have defaults applied when no value exists in db (gh-870)', async function() {
    const id = new DocumentObjectId();

    await BlogPostB.collection.insertOne({ _id: id, title: 'issue 870' });

    const found = await BlogPostB.findById(id, 'def comments');
    assert.ok(found);
    assert.equal(found._id.toString(), id);
    assert.strictEqual(undefined, found.title);
    assert.strictEqual('kandinsky', found.def);
    assert.strictEqual(undefined, found.author);
    assert.strictEqual(true, Array.isArray(found.comments));
    assert.equal(found.comments.length, 0);
  });

  it('including subdoc field excludes other subdoc fields (gh-1027)', async function() {

    const doc = await BlogPostB.create({ comments: [{ title: 'a' }, { title: 'b' }] });
    const found = await BlogPostB.findById(doc._id).select('_id comments.title');
    assert.ok(found);
    assert.equal(doc._id.toString(), found._id.toString());
    assert.strictEqual(undefined, found.title);
    assert.strictEqual(true, Array.isArray(found.comments));
    found.comments.forEach(function(comment) {
      assert.equal(comment.body, undefined);
      assert.equal(comment.comments, undefined);
      assert.equal(comment._id, undefined);
      assert.ok(!!comment.title);
    });
  });

  it('excluding nested subdoc fields (gh-1027)', async function() {

    const doc = await BlogPostB.create({ title: 'top', comments: [{ title: 'a', body: 'body' }, { title: 'b', body: 'body', comments: [{ title: 'c' }] }] });
    const found = await BlogPostB.findById(doc._id).select('-_id -comments.title -comments.comments.comments -numbers');
    assert.ok(found);
    assert.equal(found._id, undefined);
    assert.strictEqual(found.title, 'top');
    assert.equal(found.numbers, undefined);
    assert.strictEqual(true, Array.isArray(found.comments));
    found.comments.forEach(function(comment) {
      assert.equal(comment.title, undefined);
      assert.equal(comment.body, 'body');
      assert.strictEqual(Array.isArray(comment.comments), true);
      assert.ok(comment._id);
      comment.comments.forEach(function(comment) {
        assert.equal(comment.title, 'c');
        assert.equal(comment.body, undefined);
        assert.equal(comment.comments, undefined);
        assert.ok(comment._id);
      });
    });
  });

  describe('with $elemMatch projection', function() {
    // mongodb 2.2 support

    it('casts elemMatch args (gh-1091)', async function() {
      const postSchema = new Schema({
        ids: [{ type: Schema.ObjectId }]
      });

      const B = db.model('Test', postSchema);
      const _id1 = new mongoose.Types.ObjectId();
      const _id2 = new mongoose.Types.ObjectId();

      const doc = await B.create({ ids: [_id1, _id2] });
      let found = await B.findById(doc._id).select({ ids: { $elemMatch: { $in: [_id2.toString()] } } });
      assert.ok(found);
      assert.equal(found.id, doc.id);
      assert.equal(found.ids.length, 1);
      assert.equal(found.ids[0].toString(), _id2.toString());
      found = await B.find({ _id: doc._id }).select({ ids: { $elemMatch: { $in: [_id2.toString()] } } });
      assert.ok(found.length);
      found = found[0];
      assert.equal(found.id, doc.id);
      assert.equal(found.ids.length, 1);
      assert.equal(found.ids[0].toString(), _id2.toString());
    });

    it('saves modified elemMatch paths (gh-1334)', async function() {
      const postSchema = new Schema({
        ids: [{ type: Schema.ObjectId }],
        ids2: [{ type: Schema.ObjectId }]
      });

      const B = db.model('Test', postSchema);
      const _id1 = new mongoose.Types.ObjectId();
      const _id2 = new mongoose.Types.ObjectId();

      const doc = await B.create({ ids: [_id1, _id2], ids2: [_id2, _id1] });
      let found = await B.findById(doc._id).select({ ids2: { $elemMatch: { $in: [_id1.toString()] } } });
      assert.equal(found.ids2.length, 1);
      found.ids2.set(0, _id2);
      await found.save();
      found = await B.findById(doc._id).select({ ids: { $elemMatch: { $in: [_id2.toString()] } } }).select('ids2');
      assert.equal(2, found.ids2.length);
      assert.equal(_id2.toHexString(), found.ids2[0].toHexString());
      assert.equal(_id2.toHexString(), found.ids2[1].toHexString());

      found.ids.pull(_id2);
      const err = await found.save().then(() => null, err => err);
      assert.ok(err);
    });

    it('works with $ positional in select (gh-2031)', async function() {
      const postSchema = new Schema({
        tags: [{ tag: String, count: Number }]
      });

      const Post = db.model('Test', postSchema);
      await Post.create({ tags: [{ tag: 'bacon', count: 2 }, { tag: 'eggs', count: 3 }] });
      const post = await Post.findOne({ 'tags.tag': 'eggs' }, { 'tags.$': 1 });
      post.tags[0].count = 1;
      const err = await post.save().then(() => null, err => err);
      assert.ok(err);
    });
  });

  it('selecting an array of docs applies defaults properly (gh-1108)', async function() {
    const M = BlogPostB;

    const m = new M({ title: '1108', comments: [{ body: 'yay' }] });
    m.comments[0].comments = undefined;
    const doc = await m.save();
    const found = await M.findById(doc._id).select('comments');
    assert.ok(Array.isArray(found.comments));
    assert.equal(found.comments.length, 1);
    assert.ok(Array.isArray(found.comments[0].comments));
  });

  it('select properties named length (gh-3903)', async function() {
    const schema = new mongoose.Schema({
      length: Number,
      name: String
    });

    const MyModel = db.model('Test', schema);
    await MyModel.create({ name: 'val', length: 3 });
    const doc = await MyModel.findOne({}).select({ length: 1 });
    assert.ok(!doc.name);
  });

  it('appropriately filters subdocuments based on properties (gh-1280)', async function() {
    const RouteSchema = new Schema({
      stations: {
        start: {
          name: { type: String },
          loc: { type: [Number], index: '2d' }
        },
        end: {
          name: { type: String },
          loc: { type: [Number], index: '2d' }
        },
        points: [
          {
            name: { type: String },
            loc: { type: [Number], index: '2d' }
          }
        ]
      }
    });

    const Route = db.model('Test', RouteSchema);

    const item = {
      stations: {
        start: {
          name: 'thing',
          loc: [1, 2]
        },
        end: {
          name: 'thingend',
          loc: [2, 3]
        },
        points: [{ name: 'rawr' }]
      }
    };
    const i = await Route.create(item);
    let res = await Route.findById(i.id).select('-stations');
    assert.equal(res.stations.toString(), 'MongooseDocument { undefined }');
    res = await Route.findById(i.id).select('-stations.start -stations.end');
    assert.equal(res.stations.start.toString(), 'MongooseDocument { undefined }');
    assert.equal(res.stations.end.toString(), 'MongooseDocument { undefined }');
    assert.ok(Array.isArray(res.stations.points));
  });

  it('sets defaults correctly in child docs with projection (gh-7159)', async function() {
    const CalendarSchema = new Schema({
      dateFormat: {
        type: String,
        default: 'dd/MM/yyyy'
      },
      locale: {
        type: String,
        default: 'en-gb'
      }
    }, { _id: false });

    const SettingsSchema = new Schema({
      calendar: {
        type: CalendarSchema,
        default: {}
      }
    }, { _id: false });

    const BlogPostSchema = new Schema({
      author: String,
      settings: {
        type: SettingsSchema,
        default: {}
      }
    });

    db.deleteModel(/BlogPost/);
    const BlogPost = db.model('BlogPost', BlogPostSchema);

    await BlogPost.create({
      author: 'me',
      settings: {
        calendar: {
          dateFormat: '1234'
        }
      }
    });

    await BlogPost.updateOne({}, { $unset: { 'settings.calendar.locale': 1 } });

    let doc = await BlogPost.findOne();
    assert.strictEqual(doc.settings.calendar.locale, 'en-gb');
    assert.strictEqual(doc.settings.calendar.dateFormat, '1234');

    doc = await BlogPost.findOne().select('settings author');
    assert.strictEqual(doc.settings.calendar.locale, 'en-gb');
    assert.strictEqual(doc.settings.calendar.dateFormat, '1234');
  });

  it('when `select: true` in schema, works with $elemMatch in projection', async function() {
    const productSchema = new Schema({
      attributes: {
        select: true,
        type: [{ name: String, group: String }]
      }
    });

    const Product = db.model('Product', productSchema);

    const attributes = [
      { name: 'a', group: 'alpha' },
      { name: 'b', group: 'beta' }
    ];

    await Product.create({ name: 'test', attributes });

    const product = await Product.findOne()
      .select({ attributes: { $elemMatch: { group: 'beta' } } });

    assert.equal(product.attributes[0].name, 'b');
    assert.equal(product.attributes[0].group, 'beta');
    assert.equal(product.attributes.length, 1);
  });

  it('selection specified in query overwrites option in schema', async function() {
    const productSchema = new Schema({ name: { type: String, select: false } });

    const Product = db.model('Product', productSchema);

    await Product.create({ name: 'Computer' });

    const product = await Product.findOne().select('name');

    assert.equal(product.name, 'Computer');
  });

  it('selecting with `false` instead of `0` doesn\'t overwrite schema `select: false` (gh-8923)', async function() {
    const userSchema = new Schema({
      name: { type: String, select: false },
      age: { type: Number }
    });

    const User = db.model('User', userSchema);

    await User.create({ name: 'Hafez', age: 25 });

    const user = await User.findOne().select({ age: false });

    assert.ok(!user.name);
  });

  it('handles deselecting _id when other field has schema-level `select: false` (gh-12670)', async function() {
    const schema = new mongoose.Schema({
      field1: {
        type: String,
        select: false
      },
      field2: String
    });
    const User = db.model('User', schema);

    await User.create({ field1: 'test1', field2: 'test2' });
    const doc = await User.findOne().select('field2 -_id');
    assert.ok(doc.field2);
    assert.strictEqual(doc.field1, undefined);
    assert.strictEqual(doc._id, undefined);
  });
});
