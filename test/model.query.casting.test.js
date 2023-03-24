'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

const mongoose = start.mongoose;

const CastError = mongoose.SchemaType.CastError;
const DocumentObjectId = mongoose.Types.ObjectId;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Schema = mongoose.Schema;

describe('model query casting', function() {
  let Comments;
  let BlogPostB;
  let geoSchemaArray;
  let geoSchemaObject;
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
      title: { $type: String },
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [{ $type: Number }],
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: { $type: String, default: 'kandinsky' }
    }, { typeKey: '$type' });

    BlogPostB = db.model('BlogPost', BlogPostSchema);

    geoSchemaArray = new Schema({ loc: { type: [Number], index: '2d' } });
    geoSchemaObject = new Schema({ loc: { long: Number, lat: Number } });
    geoSchemaObject.index({ loc: '2d' });
  });

  it('works', async function() {
    const title = 'Loki ' + random();

    const post = new BlogPostB();
    const id = post.get('_id').toString();

    post.set('title', title);
    await post.save();
    const doc = await BlogPostB.findOne({ _id: id });
    assert.equal(doc.get('title'), title);
  });

  it('returns cast errors', async function() {
    const err = await BlogPostB.find({ date: 'invalid date' }).then(() => null, err => err);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof CastError);
  });

  it('casts $modifiers', async function() {
    const post = new BlogPostB({
      meta: {
        visitors: -75
      }
    });
    await post.save();
    const found = await BlogPostB.find({ 'meta.visitors': { $gt: '-100', $lt: -50 } });
    assert.ok(found);
    assert.equal(found.length, 1);
    assert.equal(found[0].get('_id').toString(), post.get('_id'));
    assert.equal(found[0].get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
  });

  it('casts $in values of arrays (gh-199)', async function() {
    const post = new BlogPostB();
    const id = post._id.toString();
    await post.save();
    const doc = await BlogPostB.findOne({ _id: { $in: [id] } });
    assert.equal(doc._id.toString(), id);
  });

  it('casts $in values of arrays with single item instead of array (gh-3238)', async function() {
    const post = new BlogPostB();
    const id = post._id.toString();

    await post.save();

    const doc = await BlogPostB.findOne({ _id: { $in: id } });
    assert.equal(doc._id.toString(), id);
  });

  it('casts $nin values of arrays (gh-232)', async function() {
    const NinSchema = new Schema({
      num: Number
    });

    const Nin = db.model('Test', NinSchema);

    await Nin.create([
      { num: 1 },
      { num: 2 },
      { num: 3 }
    ]);

    const found = await Nin.find({ num: { $nin: [2] } });
    assert.equal(found.length, 2);
  });

  it('works when finding by Date (gh-204)', async function() {
    const P = BlogPostB;

    const post = new P();

    post.meta.date = new Date();
    await post.save();

    let doc = await P.findOne({ _id: post._id, 'meta.date': { $lte: Date.now() } });
    assert.equal(doc._id.toString(), post._id.toString());
    doc.meta.date = null;
    await doc.save();

    doc = await P.findById(doc._id);
    assert.strictEqual(doc.meta.date, null);
  });

  it('works with $type matching', async function() {
    const B = BlogPostB;

    await B.deleteMany({});

    await B.collection.insertMany([{ title: 'test' }, { title: 1 }]);

    const err = await B.find({ title: { $type: { x: 1 } } }).then(() => null, err => err);
    assert.equal(err.message,
      '$type parameter must be number, string, or array of numbers and strings');

    let posts = await B.find({ title: { $type: 2 } });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].title, 'test');

    posts = await B.find({ title: { $type: ['string', 'number'] } });
    assert.equal(posts.length, 2);
  });

  it('works when finding Boolean with $in (gh-998)', async function() {
    const B = BlogPostB;

    const b = new B({ published: true });
    await b.save();
    const doc = await B.find({ _id: b._id, boolean: { $in: [null, true] } });
    assert.ok(doc);
    assert.equal(doc[0].id, b.id);
  });

  it('works when finding Boolean with $ne (gh-1093)', async function() {
    const B = BlogPostB;

    const b = new B({ published: false });
    await b.save();
    const doc = await B.find().ne('published', true).exec();
    assert.ok(doc);
    assert.equal(doc[0].id, b.id);
  });

  it('properly casts $and (gh-1180)', function() {
    const B = BlogPostB;
    const result = B.find({}).cast(B, { $and: [{ date: '1987-03-17T20:00:00.000Z' }, { _id: '000000000000000000000000' }] });
    assert.ok(result.$and[0].date instanceof Date);
    assert.ok(result.$and[1]._id instanceof DocumentObjectId);
  });

  describe('$near', function() {
    this.slow(60);

    it('with arrays', async function() {
      const Test = db.model('Test', geoSchemaArray);
      await Test.init();
      await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

      const docs = await Test.find({ loc: { $near: ['30', '40'] } });
      assert.equal(docs.length, 2);
    });

    it('with objects', async function() {
      const Test = db.model('Test', geoSchemaObject);
      await Test.init();
      await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

      const docs = await Test.find({ loc: { $near: ['30', '40'], $maxDistance: 51 } });
      assert.equal(docs.length, 2);
    });

    it('with nested objects', async function() {
      const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
      geoSchemaObject.index({ 'loc.nested': '2d' });

      const Test = db.model('Test', geoSchemaObject);
      await Test.init();
      await Test.create(
        { loc: { nested: { long: 10, lat: 20 } } },
        { loc: { nested: { long: 40, lat: 90 } } }
      );

      const docs = await Test.find({ 'loc.nested': { $near: ['30', '40'], $maxDistance: '50' } });
      assert.equal(docs.length, 1);
    });
  });

  describe('$nearSphere', function() {
    this.slow(70);

    it('with arrays', async function() {
      const Test = db.model('Test', geoSchemaArray);
      await Test.init();
      await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

      const docs = await Test.find({ loc: { $nearSphere: ['30', '40'] } });
      assert.equal(docs.length, 2);
    });

    it('with objects', async function() {
      const Test = db.model('Test', geoSchemaObject);
      await Test.init();
      await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

      const docs = await Test.find({ loc: { $nearSphere: ['30', '40'], $maxDistance: 1 } });
      assert.equal(docs.length, 2);
    });

    it('with nested objects', async function() {
      const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
      geoSchemaObject.index({ 'loc.nested': '2d' });

      const Test = db.model('Test', geoSchemaObject);
      await Test.init();
      await Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } });

      const docs = await Test.find({ 'loc.nested': { $nearSphere: ['30', '40'], $maxDistance: 1 } });
      assert.equal(docs.length, 2);
    });
  });

  describe('$within', function() {
    this.slow(60);

    describe('$centerSphere', function() {
      it('with arrays', async function() {
        const Test = db.model('Test', geoSchemaArray);
        await Test.init();
        await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

        const docs = await Test.find({ loc: { $within: { $centerSphere: [['11', '20'], '0.4'] } } });
        assert.equal(docs.length, 1);
      });

      it('with objects', async function() {
        const Test = db.model('Test', geoSchemaObject);
        await Test.init();
        await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

        const docs = await Test.find({ loc: { $within: { $centerSphere: [['11', '20'], '0.4'] } } });
        assert.equal(docs.length, 1);
      });

      it('with nested objects', async function() {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);
        await Test.init();
        await Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } });

        const docs = await Test.find({ 'loc.nested': { $within: { $centerSphere: [['11', '20'], '0.4'] } } });
        assert.equal(docs.length, 1);
      });
    });

    describe('$center', function() {
      it('with arrays', async function() {
        const Test = db.model('Test', geoSchemaArray);
        await Test.init();
        await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

        const docs = await Test.find({ loc: { $within: { $center: [['11', '20'], '1'] } } });
        assert.equal(docs.length, 1);
      });

      it('with objects', async function() {
        const Test = db.model('Test', geoSchemaObject);
        await Test.init();
        await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

        const docs = await Test.find({ loc: { $within: { $center: [['11', '20'], '1'] } } });
        assert.equal(docs.length, 1);
      });

      it('with nested objects', async function() {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);
        await Test.init();

        await Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } });
        const docs = await Test.find({ 'loc.nested': { $within: { $center: [['11', '20'], '1'] } } });
        assert.equal(docs.length, 1);
      });
    });

    describe('$polygon', function() {
      it('with arrays', async function() {
        const Test = db.model('Test', geoSchemaArray);
        await Test.init();

        await Test.create({ loc: [10, 20] }, { loc: [40, 90] });
        const docs = await Test.find({ loc: { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } });
        assert.equal(docs.length, 2);
      });

      it('with objects', async function() {
        const Test = db.model('Test', geoSchemaObject);
        await Test.init();

        await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

        const docs = await Test.find({ loc: { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } });
        assert.equal(docs.length, 2);
      });

      it('with nested objects', async function() {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);
        await Test.init();
        await Test.create({ loc: { nested: { long: 10, lat: 20 } } }, { loc: { nested: { long: 40, lat: 90 } } });

        const docs = await Test.find({ 'loc.nested': { $within: { $polygon: [['8', '1'], ['8', '100'], ['50', '100'], ['50', '1']] } } });
        assert.equal(docs.length, 2);
      });
    });

    describe('$box', function() {
      it('with arrays', async function() {
        const Test = db.model('Test', geoSchemaArray);
        await Test.init();

        await Test.create({ loc: [10, 20] }, { loc: [40, 90] });
        const docs = await Test.find({ loc: { $within: { $box: [['8', '1'], ['50', '100']] } } });
        assert.equal(docs.length, 2);
      });

      it('with objects', async function() {
        const Test = db.model('Test', geoSchemaObject);
        await Test.init();

        await Test.create({ loc: { long: 10, lat: 20 } }, { loc: { long: 40, lat: 90 } });

        const docs = await Test.find({ loc: { $within: { $box: [['8', '1'], ['50', '100']] } } });
        assert.equal(docs.length, 2);
      });

      it('with nested objects', async function() {
        const geoSchemaObject = new Schema({ loc: { nested: { long: Number, lat: Number } } });
        geoSchemaObject.index({ 'loc.nested': '2d' });

        const Test = db.model('Test', geoSchemaObject);
        await Test.init();

        await Test.create(
          { loc: { nested: { long: 10, lat: 20 } } },
          { loc: { nested: { long: 40, lat: 90 } } }
        );

        const docs = await Test.find({ 'loc.nested': { $within: { $box: [['8', '1'], ['50', '100']] } } });
        assert.equal(docs.length, 2);
      });
    });
  });

  describe('$options', function() {
    it('works on arrays gh-1462', function() {
      const opts = {};
      opts.toString = function() {
        return 'img';
      };

      const B = BlogPostB;
      const result = B.find({}).cast(B, { tags: { $regex: /a/, $options: opts } });

      assert.equal(result.tags.$options, 'img');
    });
    it('does not cast with uppercase (gh-7800)', function() {
      const testSchema = new Schema({
        name: { type: String, uppercase: true }
      });

      const Model = db.model('Test', testSchema);
      const result = Model.find({}).cast(Model, { name: { $regex: /a/, $options: 'i' } });

      assert.equal(result.name.$options, 'i');
    });
  });

  describe('$elemMatch', function() {
    it('should cast String to ObjectId in $elemMatch', async function() {
      const commentId = new mongoose.Types.ObjectId(111);

      const post = new BlogPostB({ comments: [{ _id: commentId }] });
      const id = post._id.toString();

      await post.save();
      const doc = await BlogPostB.findOne({ _id: id, comments: { $elemMatch: { _id: commentId.toString() } } });
      assert.equal(doc._id.toString(), id);
    });

    it('should cast String to ObjectId in $elemMatch inside $not', async function() {
      const commentId = new mongoose.Types.ObjectId(111);

      const post = new BlogPostB({ comments: [{ _id: commentId }] });
      const id = post._id.toString();

      await post.save();
      const doc = await BlogPostB.findOne({ _id: id, comments: { $not: { $elemMatch: { _id: commentId.toString() } } } });
      assert.equal(doc, null);
    });

    it('should cast subdoc _id typed as String to String in $elemMatch gh3719', async function() {
      const child = new Schema({
        _id: { type: String }
      }, { _id: false });

      const parent = new Schema({
        children: [child]
      });

      const Parent = db.model('Parent', parent);

      await Parent.create({ children: [{ _id: 'foobar' }] });
      const docs = await Parent.find({
        $and: [{ children: { $elemMatch: { _id: 'foobar' } } }]
      });
      assert.equal(docs.length, 1);
    });

    it('should cast subdoc _id typed as String to String in $elemMatch inside $not gh3719', async function() {
      const child = new Schema({
        _id: { type: String }
      }, { _id: false });

      const parent = new Schema({
        children: [child]
      });

      const Parent = db.model('Parent', parent);

      await Parent.create({ children: [{ _id: 'foobar' }] });

      const docs = await Parent.find({
        $and: [{ children: { $not: { $elemMatch: { _id: 'foobar' } } } }]
      });
      assert.equal(docs.length, 0);
    });

    it('casts $nor within $elemMatch (gh-9479)', async function() {
      const Test = db.model('Test', Schema({
        arr: [{ x: Number, y: Number }]
      }));

      const _doc = await Test.create({ arr: [{ x: 1 }, { y: 3 }, { x: 2 }] });

      const doc = await Test.findOne({
        arr: { $elemMatch: { $nor: [{ x: 1 }, { y: 3 }] } }
      });

      assert.equal(_doc._id.toString(), doc._id.toString());
    });
  });

  it('works with $all (gh-3394)', async function() {
    const MyModel = db.model('Test', { tags: [ObjectId] });

    const savedDoc = await MyModel.create({
      tags: ['00000000000000000000000a', '00000000000000000000000b']
    });
    assert.equal(typeof savedDoc.tags[0], 'object');

    const doc = await MyModel.findOne({ tags: { $all: savedDoc.tags } });
    assert.ok(doc);
  });

  it('date with $not + $type (gh-4632)', async function() {
    const MyModel = db.model('Test', { test: Date });

    await MyModel.find({ test: { $not: { $type: 9 } } });
  });

  it('setOnInsert with custom type (gh-5126)', async function() {
    function Point(key, options) {
      mongoose.SchemaType.call(this, key, options, 'Point');
    }

    mongoose.Schema.Types.Point = Point;
    Point.prototype = Object.create(mongoose.SchemaType.prototype);

    let called = 0;
    Point.prototype.cast = function(point) {
      ++called;
      if (point.type !== 'Point') {
        throw new Error('Woops');
      }

      return point;
    };

    const testSchema = new mongoose.Schema({ name: String, test: Point });
    const Test = db.model('Test', testSchema);

    const u = {
      $setOnInsert: {
        name: 'a',
        test: {
          type: 'Point'
        }
      }
    };
    await Test.findOneAndUpdate({ name: 'a' }, u).exec();
    assert.equal(called, 1);
  });

  it('lowercase in query (gh-4569)', async function() {
    const contexts = [];

    const testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    });

    const Test = db.model('Test', testSchema);
    return Test.create({ name: 'val', num: 2.02 }).
      then(function() {
        assert.equal(contexts.length, 1);
        assert.equal(contexts[0].constructor.name, 'model');
        return Test.findOne({ name: 'VAL' });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 2);
      }).
      then(function() {
        return Test.findOneAndUpdate({}, { num: 3.14 }, { new: true });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 3);
        assert.equal(contexts.length, 2);
        assert.equal(contexts[1].constructor.name, 'Query');
      });
  });

  it('runSettersOnQuery only once on find (gh-5434)', async function() {
    let vs = [];
    const UserSchema = new mongoose.Schema({
      name: String,
      foo: {
        type: Number,
        get: function(val) {
          return val.toString();
        },
        set: function(val) {
          vs.push(val);
          return val;
        }
      }
    });

    const Test = db.model('Test', UserSchema);

    await Test.find({ foo: '123' }).exec();
    assert.equal(vs.length, 1);
    assert.strictEqual(vs[0], '123');

    vs = [];
    await Test.find({ foo: '123' });
    assert.equal(vs.length, 1);
    assert.strictEqual(vs[0], '123');
  });

  it('setters run only once on findOne (gh-6157)', async function() {
    let vs = [];
    const UserSchema = new mongoose.Schema({
      name: String,
      foo: {
        type: Number,
        get: function(val) {
          return val.toString();
        },
        set: function(val) {
          vs.push(val);
          return val;
        }
      }
    });

    const Test = db.model('Test', UserSchema);

    await Test.findOne({ foo: '123' });
    assert.equal(vs.length, 1);
    assert.strictEqual(vs[0], '123');

    vs = [];
    await Test.findOne({ foo: '123' });
    assert.equal(vs.length, 1);
    assert.strictEqual(vs[0], '123');
  });

  it('runSettersOnQuery as query option (gh-5350)', function() {
    const contexts = [];

    const testSchema = new Schema({
      name: { type: String, lowercase: true },
      num: {
        type: Number,
        set: function(v) {
          contexts.push(this);
          return Math.floor(v);
        }
      }
    });

    const Test = db.model('Test', testSchema);
    return Test.create({ name: 'val', num: 2.02 }).
      then(function() {
        assert.equal(contexts.length, 1);
        assert.equal(contexts[0].constructor.name, 'model');
        return Test.findOne({ name: 'VAL' }, { _id: 0 });
      }).
      then(function(doc) {
        assert.ok(doc);
        assert.equal(doc.name, 'val');
        assert.equal(doc.num, 2);
      });
  });

  it('_id = 0 (gh-4610)', async function() {
    const MyModel = db.model('Test', { _id: Number });

    await MyModel.create({ _id: 0 });
    const doc = await MyModel.findById({ _id: 0 });
    assert.ok(doc);
    assert.equal(doc._id, 0);
  });

  it('converts to CastError (gh-6803)', function() {
    const membershipSchema = new Schema({ tier: String });
    const schema = new Schema({ membership: membershipSchema, name: String });
    const Model = db.model('Test', schema);

    return Model.findOne({ membership: '12345' }).
      catch(error => {
        assert.equal(error.name, 'CastError');
        assert.equal(error.path, 'membership');
        assert.equal(error.reason.name, 'ObjectParameterError');
      });
  });

  it('minDistance (gh-4197)', async function() {
    const schema = new Schema({
      name: String,
      loc: {
        type: { type: String },
        coordinates: [Number]
      }
    });

    schema.index({ loc: '2dsphere' });

    const MyModel = db.model('Test', schema);
    await MyModel.init();

    const docs = [
      { name: 'San Mateo Caltrain', loc: _geojsonPoint([-122.33, 37.57]) },
      { name: 'Squaw Valley', loc: _geojsonPoint([-120.24, 39.21]) },
      { name: 'Mammoth Lakes', loc: _geojsonPoint([-118.9, 37.61]) }
    ];
    const RADIUS_OF_EARTH_IN_METERS = 6378100;
    await MyModel.create(docs);

    const results = await MyModel.
      find().
      near('loc', {
        center: [-122.33, 37.57],
        minDistance: (1000 / RADIUS_OF_EARTH_IN_METERS).toString(),
        maxDistance: (280000 / RADIUS_OF_EARTH_IN_METERS).toString(),
        spherical: true
      }).
      exec();

    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Squaw Valley');
  });
  it('array ops don\'t break with strict:false (gh-6952)', function() {
    const schema = new Schema({}, { strict: false });
    const Test = db.model('Test', schema);
    return Test.create({ outerArray: [] })
      .then(function(created) {
        const toBePushedObj = { innerArray: ['onetwothree'] };
        const update = { $push: { outerArray: toBePushedObj } };
        const opts = { new: true };
        return Test.findOneAndUpdate({ _id: created._id }, update, opts);
      })
      .then(function(updated) {
        const doc = updated.toObject();
        assert.strictEqual(doc.outerArray[0].innerArray[0], 'onetwothree');
      });
  });
});

function _geojsonPoint(coordinates) {
  return { type: 'Point', coordinates: coordinates };
}
