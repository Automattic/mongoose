'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const Query = require('../lib/query');
const assert = require('assert');
const random = require('./util').random;
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const MongooseBuffer = mongoose.Types.Buffer;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model: querying:', function() {
  let Comments;
  let BlogPostB;
  let ModSchema;
  let geoSchema;
  let db;

  before(() => { db = start(); });

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

    BlogPostB = new Schema({
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

    BlogPostB = db.model('BlogPost', BlogPostB);

    ModSchema = Schema({
      num: Number, str: String
    });

    geoSchema = new Schema({ loc: { type: [Number], index: '2d' } });
  });

  let mongo26_or_greater = false;
  before(async function() {
    const version = await start.mongodVersion();

    mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
    if (!mongo26_or_greater) {
      console.log('not testing mongodb 2.6 features');
    }
  });

  after(async function() {
    await db.close();
  });

  it('find returns a Query', function() {
    // query
    assert.ok(BlogPostB.find({}) instanceof Query);

    // query, fields
    assert.ok(BlogPostB.find({}, {}) instanceof Query);

    // query, fields (empty string)
    assert.ok(BlogPostB.find({}, '') instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.find({}, {}, {}) instanceof Query);

    // query, fields (null), options
    assert.ok(BlogPostB.find({}, null, {}) instanceof Query);
  });

  it('findOne returns a Query', function() {
    // query
    assert.ok(BlogPostB.findOne({}) instanceof Query);

    // query, fields
    assert.ok(BlogPostB.findOne({}, {}) instanceof Query);

    // query, fields (empty string)
    assert.ok(BlogPostB.findOne({}, '') instanceof Query);

    // query, fields, options
    assert.ok(BlogPostB.findOne({}, {}, {}) instanceof Query);

    // query, fields (null), options
    assert.ok(BlogPostB.findOne({}, null, {}) instanceof Query);
  });

  describe('distinct', function() {
    it('returns a Query', function(done) {
      assert.ok(BlogPostB.distinct('title', {}) instanceof Query);
      done();
    });

    it('executes when you exec', async function() {
      let Address = new Schema({ zip: String });
      Address = db.model('Test', Address);

      await Address.create({ zip: '10010' }, { zip: '10010' }, { zip: '99701' });
      const query = Address.distinct('zip', {});
      assert.ok(query instanceof Query);
      const results = await query.exec();

      assert.equal(results.length, 2);
      assert.ok(results.indexOf('10010') > -1);
      assert.ok(results.indexOf('99701') > -1);
    });

    it('permits excluding conditions gh-1541', async function() {
      let Address = new Schema({ zip: String });
      Address = db.model('Test', Address);
      await Address.create({ zip: '10010' }, { zip: '10010' }, { zip: '99701' });
      const results = await Address.distinct('zip');
      assert.equal(results.length, 2);
      assert.ok(results.indexOf('10010') > -1);
      assert.ok(results.indexOf('99701') > -1);

    });
  });

  describe('updateOne', function() {
    it('returns a Query', function() {
      assert.ok(BlogPostB.updateOne({}, {}) instanceof Query);
      assert.ok(BlogPostB.updateOne({}, {}, {}) instanceof Query);
    });

    it('can handle minimize option (gh-3381)', function() {
      const Model = db.model('Test', {
        name: String,
        mixed: Schema.Types.Mixed
      });

      return Model.create({}).
        then(() => Model.replaceOne({}, { mixed: {}, name: 'abc' }, { minimize: true })).
        then(() => Model.collection.findOne()).
        then(doc => {
          assert.ok(doc.mixed == null);
        });
    });
  });

  describe('findOne', function() {
    it('works', async function() {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      await post.save();

      const doc = await BlogPostB.findOne({ title: title });
      assert.equal(title, doc.get('title'));
      assert.equal(doc.isNew, false);
    });

    it('casts $modifiers', async function() {
      const post = new BlogPostB({
        meta: {
          visitors: -10
        }
      });

      await post.save();
      const query = { 'meta.visitors': { $gt: '-20', $lt: -1 } };
      const found = await BlogPostB.findOne(query);
      assert.ok(found);
      assert.equal(found.get('meta.visitors').valueOf(), post.get('meta.visitors').valueOf());
      found.id; // trigger caching
      assert.equal(found.get('_id').toString(), post.get('_id'));
    });

    it('querying if an array contains one of multiple members $in a set', async function() {
      const post = new BlogPostB();

      post.tags.push('football');

      await post.save();

      let doc = await BlogPostB.findOne({ tags: { $in: ['football', 'baseball'] } });
      assert.equal(doc._id.toString(), post._id);

      doc = await BlogPostB.findOne({ _id: post._id, tags: /otba/i });
      assert.equal(doc._id.toString(), post._id);

    });

    it('querying if an array contains one of multiple members $in a set 2', async function() {
      const BlogPostA = BlogPostB;
      const post = new BlogPostA({ tags: ['gooberOne'] });

      await post.save();
      const query = { tags: { $in: ['gooberOne'] } };

      const returned = await BlogPostA.findOne(query);
      assert.ok(!!~returned.tags.indexOf('gooberOne'));
      assert.equal(returned._id.toString(), post._id);

      const doc = { meta: { visitors: 9898, a: null } };
      await post.collection.insertOne(doc, {});

      const found = await BlogPostA.findOne({ _id: doc._id });
      assert.equal(found.get('meta.visitors'), 9898);

    });

    it('querying via $where a string', async function() {
      const created = await BlogPostB.create({
        title: 'Steve Jobs',
        author: 'Steve Jobs'
      });
      const found = await BlogPostB.findOne({ $where: 'this.title && this.title === this.author' });

      assert.equal(found._id.toString(), created._id);
    });

    it('querying via $where a function', async function() {
      const created = await BlogPostB.create({ author: 'Atari', slug: 'Atari' });

      const found = await BlogPostB.findOne({
        $where: function() {
          return (this.author && this.slug && this.author === this.slug);
        }
      });
      assert.equal(found._id.toString(), created._id);
    });

    it('based on nested fields', async function() {
      const post = new BlogPostB({
        meta: {
          visitors: 5678
        }
      });

      await post.save();
      const found = await BlogPostB.findOne({ 'meta.visitors': 5678 });
      assert.equal(found.get('meta.visitors')
        .valueOf(), post.get('meta.visitors').valueOf());
      assert.equal(found.get('_id').toString(), post.get('_id'));
    });

    it('based on embedded doc fields (gh-242, gh-463)', async function() {
      const created = await BlogPostB.create({ comments: [{ title: 'i should be queryable' }], numbers: [1, 2, 33333], tags: ['yes', 'no'] });
      let found = await BlogPostB.findOne({ 'comments.title': 'i should be queryable' });
      assert.equal(found._id.toString(), created._id);

      found = await BlogPostB.findOne({ 'comments.0.title': 'i should be queryable' });

      assert.equal(found._id.toString(), created._id);

      // GH-463
      found = await BlogPostB.findOne({ 'numbers.2': 33333 });
      assert.equal(found._id.toString(), created._id);

      found = await BlogPostB.findOne({ 'tags.1': 'no' });
      assert.equal(found._id.toString(), created._id);

    });

    it('works with nested docs and string ids (gh-389)', async function() {
      const created = await BlogPostB.create({ comments: [{ title: 'i should be queryable by _id' }, { title: 'me too me too!' }] });

      const id = created.comments[1]._id.toString();
      const found = await BlogPostB.findOne({ 'comments._id': id });
      assert.strictEqual(!!found, true, 'Find by nested doc id hex string fails');
      assert.equal(found._id.toString(), created._id);

    });

    it('using #all with nested #elemMatch', async function() {
      const P = BlogPostB;
      const post = new P({ title: 'nested elemMatch' });
      post.comments.push({ title: 'comment A' }, { title: 'comment B' }, { title: 'comment C' });

      const id1 = post.comments[1]._id;
      const id2 = post.comments[2]._id;

      await post.save();
      const query0 = { $elemMatch: { _id: id1, title: 'comment B' } };
      const query1 = { $elemMatch: { _id: id2.toString(), title: 'comment C' } };

      const p = await P.findOne({ comments: { $all: [query0, query1] } });
      assert.equal(p.id, post.id);
    });

    it('using #or with nested #elemMatch', async function() {
      const P = BlogPostB;
      const post = new P({ title: 'nested elemMatch' });
      post.comments.push({ title: 'comment D' }, { title: 'comment E' }, { title: 'comment F' });

      const id1 = post.comments[1]._id;

      await post.save();

      const query0 = { comments: { $elemMatch: { title: 'comment Z' } } };
      const query1 = { comments: { $elemMatch: { _id: id1.toString(), title: 'comment E' } } };

      const p = await P.findOne({ $or: [query0, query1] });
      assert.equal(p.id, post.id);

    });

    it('buffer $in array', async function() {
      const created = await BlogPostB.create({
        sigs: [Buffer.from([1, 2, 3]),
          Buffer.from([4, 5, 6]),
          Buffer.from([7, 8, 9])]
      });
      const found = await BlogPostB.findOne({ sigs: Buffer.from([1, 2, 3]) });
      found.id;
      assert.equal(found._id.toString(), created._id);
      const query = { sigs: { $in: [Buffer.from([3, 3, 3]), Buffer.from([4, 5, 6])] } };
      await BlogPostB.findOne(query);

    });

    it('regex with Array (gh-599)', async function() {
      const B = BlogPostB;
      await B.create({ tags: 'wooof baaaark meeeeow'.split(' ') });
      let doc = await B.findOne({ tags: /ooof$/ });
      assert.strictEqual(true, !!doc);
      assert.ok(!!~doc.tags.indexOf('meeeeow'));

      doc = await B.findOne({ tags: { $regex: 'eow$' } });
      assert.strictEqual(true, !!doc);
      assert.strictEqual(true, !!~doc.tags.indexOf('meeeeow'));

    });

    it('regex with options', async function() {
      const B = BlogPostB;
      const post = new B({ title: '$option queries' });
      await post.save();
      const doc = await B.findOne({ title: { $regex: ' QUERIES$', $options: 'i' } });
      assert.equal(doc.id, post.id);

    });

    it('works with $elemMatch and $in combo (gh-1100)', async function() {
      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();

      const created = await BlogPostB.create({ owners: [id1, id2] });
      const found = await BlogPostB.findOne({ owners: { $elemMatch: { $in: [id2.toString()] } } });
      assert.ok(found);
      assert.equal(created.id, found.id);

    });
  });

  describe('findById', function() {
    it('handles undefined', async function() {
      const title = 'Edwald ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      await post.save();

      const doc = await BlogPostB.findById(undefined);
      assert.equal(doc, null);
    });

    it('works', async function() {
      const title = 'Edwald ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      await post.save();

      let doc = await BlogPostB.findById(post.get('_id'));
      assert.ok(doc instanceof BlogPostB);
      assert.equal(doc.get('title'), title);

      doc = await BlogPostB.findById(post.get('_id').toHexString());
      assert.ok(doc instanceof BlogPostB);
      assert.equal(doc.get('title'), title);
    });

    it('works with partial initialization', async function() {
      const post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';
      post.meta.visitors = 53;
      post.tags = ['humidity', 'soggy'];

      await post.save();
      let doc = await BlogPostB.findById(post.get('_id'));

      assert.equal(doc.isInit('title'), true);
      assert.equal(doc.isInit('slug'), true);
      assert.equal(doc.isInit('date'), false);
      assert.equal(doc.isInit('meta.visitors'), true);
      assert.equal(doc.meta.visitors.valueOf(), 53);
      assert.equal(doc.tags.length, 2);


      doc = await BlogPostB.findById(post.get('_id'), 'title');
      assert.equal(doc.isInit('title'), true);
      assert.equal(doc.isInit('slug'), false);
      assert.equal(doc.isInit('date'), false);
      assert.equal(doc.isInit('meta.visitors'), false);
      assert.equal(doc.meta.visitors, undefined);
      assert.equal(doc.tags, undefined);


      doc = await BlogPostB.findById(post.get('_id'), '-slug');
      assert.equal(doc.isInit('title'), true);
      assert.equal(doc.isInit('slug'), false);
      assert.equal(doc.isInit('date'), false);
      assert.equal(doc.isInit('meta.visitors'), true);
      assert.equal(doc.meta.visitors, 53);
      assert.equal(doc.tags.length, 2);

      doc = await BlogPostB.findById(post.get('_id'), { title: 1 });
      assert.equal(doc.isInit('title'), true);
      assert.equal(doc.isInit('slug'), false);
      assert.equal(doc.isInit('date'), false);
      assert.equal(doc.isInit('meta.visitors'), false);
      assert.equal(doc.meta.visitors, undefined);
      assert.equal(doc.tags, undefined);

      doc = await BlogPostB.findById(post.get('_id'), 'slug');
      assert.equal(doc.isInit('title'), false);
      assert.equal(doc.isInit('slug'), true);
      assert.equal(doc.isInit('date'), false);
      assert.equal(doc.isInit('meta.visitors'), false);
      assert.equal(doc.meta.visitors, undefined);
      assert.equal(doc.tags, undefined);

    });

    it('querying if an array contains at least a certain single member (gh-220)', async function() {
      const post = new BlogPostB();

      post.tags.push('cat');

      await post.save();
      const doc = await BlogPostB.findOne({ tags: 'cat' });
      assert.equal(doc._id.toString(), post._id);
    });


    it('where an array where the $slice operator', async function() {
      const created = await BlogPostB.create({ numbers: [500, 600, 700, 800] });
      let found = await BlogPostB.findById(created._id, { numbers: { $slice: 2 } });
      assert.equal(found._id.toString(), created._id);
      assert.equal(found.numbers.length, 2);
      assert.equal(found.numbers[0], 500);
      assert.equal(found.numbers[1], 600);
      found = await BlogPostB.findById(created._id, { numbers: { $slice: -2 } });
      assert.equal(found._id.toString(), created._id);
      assert.equal(found.numbers.length, 2);
      assert.equal(found.numbers[0], 700);
      assert.equal(found.numbers[1], 800);
      found = await BlogPostB.findById(created._id, { numbers: { $slice: [1, 2] } });

      assert.equal(found._id.toString(), created._id);
      assert.equal(found.numbers.length, 2);
      assert.equal(found.numbers[0], 600);
      assert.equal(found.numbers[1], 700);

    });
  });

  describe('find', function() {
    it('works', async function() {
      const title = 'Wooooot ' + random();

      let post = new BlogPostB();
      post.set('title', title);

      await post.save();
      post = new BlogPostB();
      post.set('title', title);

      await post.save();

      const docs = await BlogPostB.find({ title: title });
      assert.equal(docs.length, 2);

      assert.equal(title, docs[0].get('title'));
      assert.equal(docs[0].isNew, false);

      assert.equal(title, docs[1].get('title'));
      assert.equal(docs[1].isNew, false);


    });

    it('returns docs where an array that contains one specific member', async function() {
      const created = await BlogPostB.create({ numbers: [100, 101, 102] });
      const found = await BlogPostB.find({ numbers: 100 });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), created._id);

    });

    it('works when comparing $ne with single value against an array', async function() {
      const schema = new Schema({
        ids: [Schema.ObjectId],
        b: Schema.ObjectId
      });

      const NE = db.model('Test', schema);

      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();
      const id3 = new DocumentObjectId();
      const id4 = new DocumentObjectId();

      await NE.create({ ids: [id1, id4], b: id3 });
      await NE.create({ ids: [id2, id4], b: id3 });

      const query = NE.find({ b: id3.toString(), ids: { $ne: id1 } });
      const nes1 = await query.exec();
      assert.equal(nes1.length, 1);

      let err = await NE.find({ b: { $ne: [1] } }).then(() => null, err => err);
      assert.equal(err.message, 'Cast to ObjectId failed for value "[ 1 ]" (type Array) at path "b" for model "Test"');

      err = await NE.find({ b: { $ne: 4 } }).then(() => null, err => err);
      assert.equal(err.message, 'Cast to ObjectId failed for value "4" (type number) at path "b" for model "Test"');

      const nes4 = await NE.find({ b: id3, ids: { $ne: id4 } });
      assert.equal(nes4.length, 0);

    });

    it('with partial initialization', async function() {
      const post = new BlogPostB();

      post.title = 'hahaha';
      post.slug = 'woot';

      await post.save();
      let docs = await BlogPostB.find({ _id: post.get('_id') });
      assert.equal(docs[0].isInit('title'), true);
      assert.equal(docs[0].isInit('slug'), true);
      assert.equal(docs[0].isInit('date'), false);
      assert.strictEqual('kandinsky', docs[0].def);

      docs = await BlogPostB.find({ _id: post.get('_id') }, 'title');
      assert.equal(docs[0].isInit('title'), true);
      assert.equal(docs[0].isInit('slug'), false);
      assert.equal(docs[0].isInit('date'), false);
      assert.strictEqual(undefined, docs[0].def);

      docs = await BlogPostB.find({ _id: post.get('_id') }, { slug: 0, def: 0 });
      assert.equal(docs[0].isInit('title'), true);
      assert.equal(docs[0].isInit('slug'), false);
      assert.equal(docs[0].isInit('date'), false);
      assert.strictEqual(undefined, docs[0].def);

      docs = await BlogPostB.find({ _id: post.get('_id') }, 'slug');
      assert.equal(docs[0].isInit('title'), false);
      assert.equal(docs[0].isInit('slug'), true);
      assert.equal(docs[0].isInit('date'), false);
      assert.strictEqual(undefined, docs[0].def);
    });

    it('where $exists', async function() {
      const ExistsSchema = new Schema({ a: Number, b: String });
      const Exists = db.model('Test', ExistsSchema);

      await Exists.create({ a: 1 }, { b: 'hi' });
      let docs = await Exists.find({ b: { $exists: true } });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].b, 'hi');

      docs = await Exists.find({ b: { $exists: 'true' } });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].b, 'hi');

      let threw = false;
      try {
        await Exists.find({ b: { $exists: 'foo' } });
      } catch (error) {
        threw = true;
        assert.equal(error.path, 'b');
        assert.equal(error.value, 'foo');
        assert.equal(error.name, 'CastError');
      }
      assert.ok(threw);
    });

    it('works with $elemMatch (gh-1100)', async function() {
      const id1 = new DocumentObjectId();
      const id2 = new DocumentObjectId();

      await BlogPostB.create({ owners: [id1, id2] });
      const found = await BlogPostB.find({ owners: { $elemMatch: { $in: [id2.toString()] } } });
      assert.equal(found.length, 1);
    });

    it('where $mod', async function() {
      const Mod = db.model('Test', ModSchema);
      const one = await Mod.create({ num: 1 });
      await Mod.create({ num: 2 });
      const found = await Mod.find({ num: { $mod: [2, 1] } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), one._id);

    });

    it('where $not', async function() {
      const Mod = db.model('Test', ModSchema);
      await Mod.create({ num: 1 });
      const two = await Mod.create({ num: 2 });
      const found = await Mod.find({ num: { $not: { $mod: [2, 1] } } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), two._id);

    });

    it('where or()', async function() {
      const Mod = db.model('Test', ModSchema);

      const [one, two] = await Mod.create({ num: 1 }, { num: 2, str: 'two' });
      let found = await Mod.find({ $or: [{ num: 1 }, { num: 2 }] });
      assert.equal(found.length, 2);

      let found1 = false;
      let found2 = false;

      found.forEach(function(doc) {
        if (doc.id === one.id) {
          found1 = true;
        } else if (doc.id === two.id) {
          found2 = true;
        }
      });

      assert.ok(found1);
      assert.ok(found2);

      found = await Mod.find({ $or: [{ str: 'two' }, { str: 'three' }] });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), two._id);

      found = await Mod.find({ $or: [{ num: 1 }] }).or([{ str: 'two' }]).exec();
      assert.equal(found.length, 2);

      found1 = false;
      found2 = false;

      found.forEach(function(doc) {
        if (doc.id === one.id) {
          found1 = true;
        } else if (doc.id === two.id) {
          found2 = true;
        }
      });

      assert.ok(found1);
      assert.ok(found2);

    });

    it('using $or with array of Document', async function() {
      const Mod = db.model('Test', ModSchema);

      const one = await Mod.create({ num: 1 });
      let found = await Mod.find({ num: 1 });
      found = await Mod.find({ $or: found });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), one._id);

    });

    it('where $ne', async function() {
      const Mod = db.model('Test', ModSchema);
      await Mod.create({ num: 1 });
      const two = await Mod.create({ num: 2 });
      const three = await Mod.create({ num: 3 });
      const found = await Mod.find({ num: { $ne: 1 } });

      assert.equal(found.length, 2);
      assert.equal(found[0]._id.toString(), two._id);
      assert.equal(found[1]._id.toString(), three._id);

    });

    it('where $nor', async function() {
      const Mod = db.model('Test', ModSchema);

      const [one, two] = await Mod.create([{ num: 1 }, { num: 2, str: 'two' }]);

      let found = await Mod.find({ $nor: [{ num: 1 }, { num: 3 }] });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), two._id);

      found = await Mod.find({ $nor: [{ str: 'two' }, { str: 'three' }] });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), one._id);

      found = await Mod.find({ $nor: [{ num: 2 }] }).nor([{ str: 'two' }]);
    });

    it('STRICT null matches', async function() {
      const a = { title: 'A', author: null };
      const b = { title: 'B' };
      const [createdA] = await BlogPostB.create([a, b]);
      const found = await BlogPostB.find({ author: { $in: [null], $exists: true } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), createdA._id);

    });

    it('null matches null and undefined', async function() {
      await BlogPostB.create(
        { title: 'A', author: null },
        { title: 'B' }
      );
      const found = await BlogPostB.find({ author: null });
      assert.equal(found.length, 2);

    });

    it('a document whose arrays contain at least $all string values', async function() {
      let post = new BlogPostB({ title: 'Aristocats' });

      post.tags.push('onex');
      post.tags.push('twox');
      post.tags.push('threex');

      await post.save();
      post = await BlogPostB.findById(post._id);

      let docs = await BlogPostB.find({ title: { $all: ['Aristocats'] } });
      assert.equal(docs.length, 1);

      docs = await BlogPostB.find({ title: { $all: [/^Aristocats/] } });
      assert.equal(docs.length, 1);

      docs = await BlogPostB.find({ tags: { $all: ['onex', 'twox', 'threex'] } });
      assert.equal(docs.length, 1);

      docs = await BlogPostB.find({ tags: { $all: [/^onex/i] } });
      assert.equal(docs.length, 1);

      docs = await BlogPostB.findOne({ tags: { $all: /^two/ } });
      assert.equal(post._id.toString(), docs._id.toString());

    });

    it('using #nor with nested #elemMatch', async function() {
      const p0 = { title: 'nested $nor elemMatch1', comments: [] };

      const p1 = { title: 'nested $nor elemMatch0', comments: [] };
      p1.comments.push({ title: 'comment X' }, { title: 'comment Y' }, { title: 'comment W' });

      const P = BlogPostB;

      const [post0, post1] = await P.create([p0, p1]);

      const id = post1.comments[1]._id;

      const query0 = { comments: { $elemMatch: { title: 'comment Z' } } };
      const query1 = { comments: { $elemMatch: { _id: id.toString(), title: 'comment Y' } } };

      const posts = await P.find({ $nor: [query0, query1] });
      assert.equal(posts.length, 1);
      assert.equal(posts[0].id, post0.id);

    });

    it('strings via regexp', async function() {
      const created = await BlogPostB.create({ title: 'Next to Normal' });
      let found = await BlogPostB.findOne({ title: /^Next/ });
      assert.equal(found._id.toString(), created._id);

      const reg = '^Next to Normal$';

      found = await BlogPostB.find({ title: { $regex: reg } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), created._id);

      found = await BlogPostB.findOne({ title: { $regex: reg } });
      assert.equal(found._id.toString(), created._id);

      found = await BlogPostB.where('title').regex(reg).findOne();
      assert.equal(found._id.toString(), created._id);

      found = await BlogPostB.where('title').regex(/^Next/).findOne();
      assert.equal(found._id.toString(), created._id);

    });

    it('a document whose arrays contain at least $all values', async function() {
      const a1 = { numbers: [-1, -2, -3, -4], meta: { visitors: 4 } };
      const a2 = { numbers: [0, -1, -2, -3, -4] };
      const [whereoutZero, whereZero] = await BlogPostB.create([a1, a2]);

      let found = await BlogPostB.find({ numbers: { $all: [-1, -2, -3, -4] } });
      assert.equal(found.length, 2);
      found = await BlogPostB.find({ 'meta.visitors': { $all: [4] } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), whereoutZero._id);
      found = await BlogPostB.find({ numbers: { $all: [0, -1] } });
      assert.equal(found.length, 1);
      assert.equal(found[0]._id.toString(), whereZero._id);
    });

    it('where $size', async function() {
      await BlogPostB.create({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
      await BlogPostB.create({ numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] });
      await BlogPostB.create({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
      let found = await BlogPostB.find({ numbers: { $size: 10 } });
      assert.equal(found.length, 2);
      found = await BlogPostB.find({ numbers: { $size: 11 } });
      assert.equal(found.length, 1);

    });

    it('$gt, $lt, $lte, $gte work on strings', async function() {
      const D = db.model('Test', new Schema({ dt: String }));

      await D.create({ dt: '2011-03-30' });
      await D.create({ dt: '2011-03-31' });
      await D.create({ dt: '2011-04-01' });
      await D.create({ dt: '2011-04-02' });

      let docs = await D.find({ dt: { $gte: '2011-03-30', $lte: '2011-04-01' } }).sort('dt');
      assert.equal(docs.length, 3);
      assert.equal(docs[0].dt, '2011-03-30');
      assert.equal(docs[1].dt, '2011-03-31');
      assert.equal(docs[2].dt, '2011-04-01');
      assert.ok(!docs.some(function(d) {
        return d.dt === '2011-04-02';
      }));

      docs = await D.find({ dt: { $gt: '2011-03-30', $lt: '2011-04-02' } }).sort('dt');
      assert.equal(docs.length, 2);
      assert.equal(docs[0].dt, '2011-03-31');
      assert.equal(docs[1].dt, '2011-04-01');
      assert.ok(!docs.some(function(d) {
        return d.dt === '2011-03-30';
      }));
      assert.ok(!docs.some(function(d) {
        return d.dt === '2011-04-02';
      }));
    });

    describe('text search indexes', function() {
      it('works with text search ensure indexes ', async function() {
        const blogPost = BlogPostB;

        await blogPost.collection.createIndex({ title: 'text' });
        const a = new blogPost({ title: 'querying in mongoose' });
        const b = new blogPost({ title: 'text search in mongoose' });
        await a.save();
        await b.save();
        const documents = await blogPost.
          find({ $text: { $search: 'text search' } }, { score: { $meta: 'textScore' } }).
          limit(2).
          exec();
        assert.equal(documents.length, 1);
        assert.equal(documents[0].title, 'text search in mongoose');

      });

      it('works when text search is called by a schema (gh-3824) (gh-6851)', async function() {
        const exampleSchema = new Schema({
          title: String,
          name: { type: String, text: true },
          tag: String
        });

        const Example = db.model('Test', exampleSchema);

        await Example.init(); // Wait for index build
        // Should not error
        await Example.findOne({ $text: { $search: 'text search' } });

        await Example.create({ name: '1234 ABCD', tag: 'test1' });
        let doc = await Example.findOne({
          $text: {
            $search: 1234 // Will be casted to a string
          }
        });
        assert.ok(doc);
        assert.equal(doc.tag, 'test1');

        doc = await Example.findOne({
          $text: {
            $search: 'abcd',
            $caseSensitive: 'no' // Casted to boolean
          }
        });
        assert.ok(doc);
        assert.equal(doc.tag, 'test1');
      });
    });
  });

  describe('limit', function() {
    it('works', async function() {
      const first = await BlogPostB.create({ title: 'first limit' });
      const second = await BlogPostB.create({ title: 'second limit' });
      await BlogPostB.create({ title: 'third limit' });
      const found = await BlogPostB.find({ title: /limit$/ }).limit(2);
      assert.equal(found.length, 2);
      assert.equal(found[0].id, first.id);
      assert.equal(found[1].id, second.id);

    });
  });

  describe('skip', function() {
    it('works', async function() {
      await BlogPostB.create({ title: '1 skip' });
      const second = await BlogPostB.create({ title: '2 skip' });
      const third = await BlogPostB.create({ title: '3 skip' });
      const found = await BlogPostB.find({ title: /skip$/ }).sort({ title: 1 }).skip(1).limit(2);
      assert.equal(found.length, 2);
      assert.equal(found[0]._id.toString(), second._id.toString());
      assert.equal(found[1]._id.toString(), third._id.toString());

    });
  });

  describe('sort', function() {
    it('works', async function() {
      const least = await BlogPostB.create({ meta: { visitors: 100 } });
      const largest = await BlogPostB.create({ meta: { visitors: 300 } });
      const middle = await BlogPostB.create({ meta: { visitors: 200 } });
      const found = await BlogPostB
        .where('meta.visitors').gt(99).lt(301)
        .sort('-meta.visitors')
        .find();
      assert.equal(found.length, 3);
      assert.equal(found[0].id, largest._id);
      assert.equal(found[1].id, middle._id);
      assert.equal(found[2].id, least._id);

    });
    it('handles sorting by text score', async function() {
      const blogPost = BlogPostB;

      await blogPost.collection.createIndex({ title: 'text' });
      const a = new blogPost({ title: 'searching in mongoose' });
      const b = new blogPost({ title: 'text search in mongoose' });
      await a.save();
      await b.save();
      const documents = await blogPost.
        find({ $text: { $search: 'text search' } }, { score: { $meta: 'textScore' } }).
        sort({ score: { $meta: 'textScore' } }).
        limit(2).
        exec();
      assert.equal(documents.length, 2);
      assert.equal(documents[0].title, 'text search in mongoose');
      assert.equal(documents[1].title, 'searching in mongoose');

    });
  });

  describe('nested mixed "x.y.z"', function() {
    it('works', async function() {
      await BlogPostB.find({ 'mixed.nested.stuff': 'skynet' });
    });
  });

  it('by Date (gh-336)', async function() {
    const Test = db.model('Test', new Schema({ date: Date }));
    const now = new Date();

    await Test.create({ date: now }, { date: new Date(now - 10000) });
    const docs = await Test.find({ date: now });
    assert.equal(docs.length, 1);

  });

  it('mixed types with $elemMatch (gh-591)', async function() {
    const S = new Schema({ a: [{}], b: Number });
    const M = db.model('Test', S);

    const m = new M();
    m.a = [1, 2, { name: 'Frodo' }, 'IDK', { name: 100 }];
    m.b = 10;

    await m.save();

    let docs = await M.find({ a: { name: 'Frodo' }, b: '10' });
    assert.equal(docs[0].a.length, 5);
    assert.equal(docs[0].b.valueOf(), 10);

    const query = {
      a: {
        $elemMatch: { name: 100 }
      }
    };
    docs = await M.find(query);
    assert.equal(docs[0].a.length, 5);
  });

  describe('$all', function() {
    it('with ObjectIds (gh-690)', async function() {
      const SSchema = new Schema({ name: String });
      const PSchema = new Schema({ sub: [SSchema] });

      const P = db.model('Test', PSchema);
      const sub = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];

      const p = await P.create({ sub: sub });

      const o0 = p.sub[0]._id;
      const o1 = p.sub[1]._id;
      const o2 = p.sub[2]._id;

      let doc = await P.findOne({ 'sub._id': { $all: [o1, o2.toString()] } });
      assert.equal(doc.id, p.id);

      doc = await P.findOne({ 'sub._id': { $all: [o0, new DocumentObjectId()] } });
      assert.equal(!!doc, false);

      doc = await P.findOne({ 'sub._id': { $all: [o2] } });
      assert.equal(doc.id, p.id);

    });

    it('with Dates', async function() {
      this.timeout(4500);
      const SSchema = new Schema({ d: Date });
      const PSchema = new Schema({ sub: [SSchema] });

      const P = db.model('Test', PSchema);
      const sub = [
        { d: new Date() },
        { d: new Date(Date.now() - 10000) },
        { d: new Date(Date.now() - 30000) }
      ];

      const p = await P.create({ sub: sub });

      const o0 = p.sub[0].d;
      const o1 = p.sub[1].d;
      const o2 = p.sub[2].d;

      let doc = await P.findOne({ 'sub.d': { $all: [o1, o2] } });
      assert.equal(doc.id, p.id);

      doc = await P.findOne({ 'sub.d': { $all: [o0, new Date()] } });
      assert.equal(!!doc, false);

      doc = await P.findOne({ 'sub.d': { $all: [o2] } });
      assert.equal(doc.id, p.id);

    });

    it('with $elemMatch (gh-3163)', async function() {
      const version = await start.mongodVersion();

      const mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      if (!mongo26_or_greater) {
        return;
      }


      const schema = new Schema({ test: [String] });
      const MyModel = db.model('Test', schema);

      await MyModel.create({ test: ['log1', 'log2'] });

      const docs = await MyModel.find({
        test: {
          $all: [
            { $elemMatch: { $regex: /log/g } }
          ]
        }
      });

      assert.equal(docs.length, 1);
    });
  });

  describe('and', function() {
    it('works with queries gh-1188', async function() {
      const B = BlogPostB;
      await B.create({ title: 'and operator', published: false, author: 'Me' });

      let docs = await B.find({ $and: [{ title: 'and operator' }] });
      assert.equal(docs.length, 1);

      docs = await B.find({ $and: [{ title: 'and operator' }, { published: true }] });
      assert.equal(docs.length, 0);

      docs = await B.find({ $and: [{ title: 'and operator' }, { published: false }] });
      assert.equal(docs.length, 1);

      let query = B.find();
      query.and([
        { title: 'and operator', published: false },
        { author: 'Me' }
      ]);
      docs = await query.exec();
      assert.equal(docs.length, 1);

      query = B.find();
      query.and([
        { title: 'and operator', published: false },
        { author: 'You' }
      ]);
      docs = await query.exec();
      assert.equal(docs.length, 0);

    });

    it('works with nested query selectors gh-1884', async function() {
      const B = db.model('Test', { a: String, b: String });

      await B.deleteOne({ $and: [{ a: 'coffee' }, { b: { $in: ['bacon', 'eggs'] } }] });
    });
  });

  it('works with different methods and query types', async function() {
    const BufSchema = new Schema({ name: String, block: Buffer });
    const Test = db.model('Test', BufSchema);

    const docA = { name: 'A', block: Buffer.from('über') };
    const docB = { name: 'B', block: Buffer.from('buffer shtuffs are neat') };
    const docC = { name: 'C', block: 'hello world' };
    const docD = { name: 'D', block: { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } };

    const [a, b, c, d] = await Test.create([docA, docB, docC, docD]);

    assert.equal(a.block.toString('utf8'), 'über');
    assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
    assert.equal(c.block.toString('utf8'), 'hello world');
    assert.equal(d.block.toString('utf8'), 'gh-6863');

    const ra = await Test.findById(a._id);
    assert.equal(ra.block.toString('utf8'), 'über');

    let rb = await Test.findOne({ block: 'buffer shtuffs are neat' });
    assert.equal(rb.block.toString('utf8'), 'buffer shtuffs are neat');

    const err = await Test.findOne({ block: /buffer/i }).then(() => null, err => err);
    assert.equal(err.message, 'Cast to Buffer failed for value ' +
              '"/buffer/i" (type RegExp) at path "block" for model "Test"');
    rb = await Test.findOne({ block: [195, 188, 98, 101, 114] });
    assert.equal(rb.block.toString('utf8'), 'über');

    rb = await Test.findOne({ block: 'aGVsbG8gd29ybGQ=' });
    assert.strictEqual(rb, null);

    rb = await Test.findOne({ block: Buffer.from('aGVsbG8gd29ybGQ=', 'base64') });
    assert.equal(rb.block.toString('utf8'), 'hello world');

    rb = await Test.findOne({ block: { type: 'Buffer', data: [195, 188, 98, 101, 114] } });
    assert.equal(rb.block.toString('utf8'), 'über');


  });

  it('with conditionals', async function() {
    // $in $nin etc
    const BufSchema = new Schema({ name: String, block: Buffer });
    const Test = db.model('Test', BufSchema);

    const docA = { name: 'A', block: new MongooseBuffer([195, 188, 98, 101, 114]) }; // über
    const docB = { name: 'B', block: new MongooseBuffer('buffer shtuffs are neat') };
    const docC = { name: 'C', block: new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64') };
    const docD = { name: 'D', block: new MongooseBuffer({ type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] }) };

    const [a, b, c, d] = await Test.create([docA, docB, docC, docD]);


    assert.equal(a.block.toString('utf8'), 'über');
    assert.equal(b.block.toString('utf8'), 'buffer shtuffs are neat');
    assert.equal(c.block.toString('utf8'), 'hello world');
    assert.equal(d.block.toString('utf8'), 'gh-6863');


    // run all of the tests in parallel
    await Promise.all([
      Test.find({ block: {
        $in: [
          [195, 188, 98, 101, 114],
          'buffer shtuffs are neat',
          Buffer.from('aGVsbG8gd29ybGQ=', 'base64'),
          { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } // gh-6863
        ] } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $in: ['über', 'hello world'] } }).exec().then(tests => {
        assert.equal(tests.length, 2);
      }),
      Test.find({ block: { $in: ['über'] } }).exec().then(tests => {
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'über');
      }),
      Test.find({ block: { $nin: ['über'] } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: {
        $nin: [
          [195, 188, 98, 101, 114],
          Buffer.from('aGVsbG8gd29ybGQ=', 'base64'),
          { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } // gh-6863
        ] } }).exec().then(tests => {
        assert.equal(tests.length, 1);
        assert.equal(tests[0].block.toString('utf8'), 'buffer shtuffs are neat');
      }),
      Test.find({ block: { $ne: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: { $gt: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 3);
      }),
      Test.find({ block: { $gte: 'über' } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $lt: Buffer.from('buffer shtuffs are neat') } }).exec().then(tests => {
        assert.equal(tests.length, 3);
        const ret = {};
        ret[tests[0].block.toString('utf8')] = 1;
        ret[tests[1].block.toString('utf8')] = 1;
        ret[tests[2].block.toString('utf8')] = 1;

        assert.ok(ret['über'] !== undefined);
      }),
      Test.find({ block: { $lte: 'buffer shtuffs are neat' } }).exec().then(tests => {
        assert.equal(tests.length, 4);
      }),
      Test.find({ block: { $gt: { type: 'Buffer', data: [103, 104, 45, 54, 56, 54, 51] } } }).exec().then(tests => {
        assert.equal(tests.length, 2);
      })
    ]);
    await Test.deleteOne({});
  });

  it('with previously existing null values in the db', async function() {
    const post = new BlogPostB();

    const doc = { meta: { visitors: 9898, a: null } };
    await post.collection.insertOne(doc, {});

    const found = await BlogPostB.findOne({ _id: doc._id });
    assert.equal(found.get('meta.visitors').valueOf(), 9898);

  });

  it('with unused values in the db', async function() {
    const post = new BlogPostB();

    const doc = { meta: { visitors: 9898, color: 'blue' } };
    await post.collection.insertOne(doc, {});

    const found = await BlogPostB.findOne({ _id: doc._id });
    assert.equal(found.get('meta.visitors').valueOf(), 9898);
    await found.save();
  });

  describe('2d', function() {
    it('$near (gh-309)', async function() {
      const Test = db.model('Test', geoSchema);

      await Test.init();
      await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

      const docs = await Test.find({ loc: { $near: [30, 40] } });
      assert.equal(docs.length, 2);

    });

    it('$within arrays (gh-586)', async function() {
      const Test = db.model('Test', geoSchema);

      await Test.init();
      await Test.create({ loc: [35, 50] }, { loc: [-40, -90] });

      const docs = await Test.find({ loc: { $within: { $box: [[30, 40], [40, 60]] } } });
      assert.equal(docs.length, 1);


    });

    it('$nearSphere with arrays (gh-610)', async function() {
      const Test = db.model('Test', geoSchema);

      await Test.init();
      await Test.create({ loc: [10, 20] }, { loc: [40, 90] });

      const docs = await Test.find({ loc: { $nearSphere: [30, 40] } });
      assert.equal(docs.length, 2);

    });

    it('$nearSphere with invalid coordinate does not crash (gh-1874)', async function() {
      const geoSchema = new Schema({
        loc: {
          type: { type: String },
          coordinates: { type: [Number], index: '2dsphere' }
        }
      });
      const Test = db.model('Test', geoSchema);


      await Test.init();
      await Test.create(
        { loc: { coordinates: [30, 41] } },
        { loc: { coordinates: [31, 40] } }
      );

      const q = new Query({}, {}, null, Test.collection);
      q.find({
        loc: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [30, 40] },
            $maxDistance: 10000000
          }
        }
      });

      q.cast(Test);
    });

    it('$maxDistance with arrays', async function() {
      const Test = db.model('Test', geoSchema);

      await Test.init();
      await Test.create({ loc: [20, 80] }, { loc: [25, 30] });

      let docs = await Test.find({ loc: { $near: [25, 31], $maxDistance: 1 } });
      assert.equal(docs.length, 1);
      docs = await Test.find({ loc: { $near: [25, 32], $maxDistance: 1 } });
      assert.equal(docs.length, 0);

    });
  });

  describe('2dsphere', function() {
    let schema2dsphere;
    let geoSchema;
    let geoMultiSchema;

    before(function() {
      schema2dsphere = new Schema({ loc: { type: [Number], index: '2dsphere' } });

      geoSchema = new Schema({ line: { type: { type: String }, coordinates: [] } });
      geoSchema.index({ line: '2dsphere' });

      geoMultiSchema = new Schema({ geom: [{ type: { type: String }, coordinates: [] }] });
      // see mongodb issue SERVER-8907
      // geoMultiSchema.index({ geom: '2dsphere' });
    });

    // mongodb 2.4
    let mongo24_or_greater = false;
    before(async function() {
      const version = await start.mongodVersion();

      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);

      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 features');
      }
    });

    it('index is allowed in schema', function(done) {
      if (!mongo24_or_greater) {
        return done();
      }

      const ok = schema2dsphere.indexes().some(function(index) {
        return index[0].loc === '2dsphere';
      });
      assert.ok(ok);
      done();
    });

    describe('$geometry', function() {
      it('Polygon', async function() {
        if (!mongo24_or_greater) {
          return;
        }

        const Test = db.model('Test', schema2dsphere);
        await Test.init();

        const created = await Test.create({ loc: [0, 0] });

        const geojsonPoly = { type: 'Polygon', coordinates: [[[-5, -5], ['-5', 5], [5, 5], [5, -5], [-5, '-5']]] };

        const docs = await Test.find({ loc: { $within: { $geometry: geojsonPoly } } });

        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const geoDocs = await Test.where('loc').within().geometry(geojsonPoly).exec();

        assert.equal(geoDocs.length, 1);
        assert.equal(created.id, geoDocs[0].id);
      });
    });

    describe('$geoIntersects', function() {
      it('LineString', async function() {
        const Test = db.model('Test', geoSchema);
        await Test.init();


        const created = await Test.create({ line: { type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]] } });

        const geojsonLine = { type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']] };

        const docs = await Test.find({ line: { $geoIntersects: { $geometry: geojsonLine } } });

        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const doc = await Test.where('line').intersects().geometry(geojsonLine).findOne();

        assert.equal(created.id, doc.id);
      });

      it('MultiLineString', async function() {
        const Test = db.model('Test', geoMultiSchema);

        const created = await Test.create({
          geom: [{ type: 'LineString', coordinates: [[-178.0, 10.0], [178.0, 10.0]] },
            { type: 'LineString', coordinates: [[-178.0, 5.0], [178.0, 5.0]] }]
        });
        const geojsonLine = { type: 'LineString', coordinates: [[180.0, 11.0], [180.0, '9.00']] };

        const docs = await Test.find({ geom: { $geoIntersects: { $geometry: geojsonLine } } });
        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const doc = await Test.where('geom').intersects().geometry(geojsonLine).findOne();
        assert.equal(created.id, doc.id);

      });

      it('MultiPolygon', async function() {
        const Test = db.model('Test', geoMultiSchema);

        const created = await Test.create({
          geom: [{ type: 'Polygon', coordinates: [[[28.7, 41], [29.2, 40.9], [29.1, 41.3], [28.7, 41]]] },
            { type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]] }]
        });

        const geojsonPolygon = { type: 'Polygon', coordinates: [[[26, 36], [45, 36], [45, 42], [26, 42], [26, 36]]] };

        const docs = await Test.find({ geom: { $geoIntersects: { $geometry: geojsonPolygon } } });
        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        const doc = await Test.where('geom').intersects().geometry(geojsonPolygon).findOne();
        assert.equal(created.id, doc.id);

      });
    });

    describe('$near', function() {
      it('Point', async function() {
        const Test = db.model('Test', geoSchema);

        await Test.init();

        const created = await Test.create({ line: { type: 'Point', coordinates: [-179.0, 0.0] } });

        const geojsonPoint = { type: 'Point', coordinates: [-179.0, 0.0] };

        let docs = await Test.find({ line: { $near: geojsonPoint } });
        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

        docs = await Test.find({ line: { $near: { $geometry: geojsonPoint, $maxDistance: 50 } } });
        assert.equal(docs.length, 1);
        assert.equal(created.id, docs[0].id);

      });

      it('works with GeoJSON (gh-1482)', async function() {
        const geoJSONSchema = new Schema({ loc: { type: { type: String }, coordinates: [Number] } });
        geoJSONSchema.index({ loc: '2dsphere' });
        const Test = db.model('Test', geoJSONSchema);
        await Test.init();

        await Test.create({ loc: { type: 'Point', coordinates: [10, 20] } }, {
          loc: {
            type: 'Point', coordinates: [40, 90]
          }
        });

        // $maxDistance is in meters... so even though they aren't that far off
        // in lat/long, need an incredibly high number here
        const docs = await Test.where('loc').near({
          center: {
            type: 'Point', coordinates: [11, 20]
          }, maxDistance: 1000000
        }).exec();
        assert.equal(docs.length, 1);

      });
      it('works with legacy 2dsphere pair in schema (gh-6937)', async function() {
        if (!mongo24_or_greater) {
          return it.skip();
        }

        const Model = db.model('Test', schema2dsphere);
        await Model.init();
        const model = new Model();
        model.loc = [1, 2];
        await model.save();
        const result = await Model.where('loc').near({ center: { type: 'Point', coordinates: [1, 2] }, maxDistance: 10 });
        assert.equal(result.length, 1);
      });
    });
  });

  describe('hashed indexes', function() {
    let mongo24_or_greater = false;

    before(async function() {
      const version = await start.mongodVersion();

      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 features');
      }
    });

    it('work', async function() {
      const schema = new Schema({ t: { type: String, index: 'hashed' } });

      const H = db.model('Test', schema);
      await H.init();
      const indexes = await H.collection.getIndexes({ full: true });

      const found = indexes.some(function(index) {
        return index.key.t === 'hashed';
      });
      assert.ok(found);

      const [doc1, doc2] = await H.create([{ t: 'hashing' }, {}]);
      assert.ok(doc1);
      assert.ok(doc2);
    });
  });

  describe('lean', function() {
    it('find', async function() {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      await post.save();
      let docs = await BlogPostB.find({ title: title }).lean().exec();
      assert.equal(docs.length, 1);
      assert.strictEqual(docs[0] instanceof mongoose.Document, false);
      docs = await BlogPostB.find({ title: title }, null, { lean: true });
      assert.equal(docs.length, 1);
      assert.strictEqual(docs[0] instanceof mongoose.Document, false);

    });

    it('removes the __v property if versionKey: false is set (gh-8934)', async function() {
      const title = 'Wooooot ' + random();
      await BlogPostB.create({ title });
      const foundPost = await BlogPostB.find({ title }).lean({ versionKey: false });
      assert.ok(!('__v' in foundPost));
      const anotherFoundPost = await BlogPostB.findOne({ title }).lean({ versionKey: false });
      assert.ok(!('__v' in anotherFoundPost));
      const updateFoundPost = await BlogPostB.findOneAndUpdate({ title: title }, { title: 'Woooot' }).lean({ versionKey: false });
      assert.ok(!('__v' in updateFoundPost));
    });

    it('findOne', async function() {
      const title = 'Wooooot ' + random();

      const post = new BlogPostB();
      post.set('title', title);

      await post.save();
      const doc = await BlogPostB.findOne({ title: title }, null, { lean: true });
      assert.ok(doc);
      assert.strictEqual(false, doc instanceof mongoose.Document);

    });
    it('properly casts nested and/or queries (gh-676)', function(done) {
      const sch = new Schema({
        num: Number,
        subdoc: { title: String, num: Number }
      });

      const M = db.model('Test', sch);

      const cond = {
        $and: [
          { $or: [{ num: '23' }, { 'subdoc.num': '45' }] },
          { $and: [{ 'subdoc.title': 233 }, { num: '345' }] }
        ]
      };
      const q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[1]['subdoc.num'], 'number');
      assert.equal(typeof q._conditions.$and[1].$and[0]['subdoc.title'], 'string');
      assert.equal(typeof q._conditions.$and[1].$and[1].num, 'number');
      done();
    });
    it('properly casts deeply nested and/or queries (gh-676)', function() {
      const sch = new Schema({
        num: Number,
        subdoc: { title: String, num: Number }
      });

      const M = db.model('Test', sch);

      const cond = {
        $and: [{ $or: [{ $and: [{ $or: [{ num: '12345' }, { 'subdoc.num': '56789' }] }] }] }]
      };
      const q = M.find(cond);
      q._castConditions();
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[0].num, 'number');
      assert.equal(typeof q._conditions.$and[0].$or[0].$and[0].$or[1]['subdoc.num'], 'number');
    });

    it('casts $elemMatch (gh-2199)', async function() {
      const schema = new Schema({ dates: [Date] });
      const Dates = db.model('Test', schema);

      const array = ['2014-07-01T02:00:00.000Z', '2014-07-01T04:00:00.000Z'];
      await Dates.create({ dates: array });
      const elemMatch = { $gte: '2014-07-01T03:00:00.000Z' };
      const doc = await Dates.findOne({}, { dates: { $elemMatch: elemMatch } });
      assert.equal(doc.dates.length, 1);
      assert.equal(doc.dates[0].getTime(),
        new Date('2014-07-01T04:00:00.000Z').getTime());

    });

    it('does not run resetId setter on query (gh-6093)', function() {
      const schema = new Schema({});

      const Test = db.model('Test', schema);

      return Test.find({ _id: { $in: [void 0] } });
    });

    describe('$eq', function() {
      it('casts $eq (gh-2752)', async function() {
        const doc = await BlogPostB.findOne(
          { _id: { $eq: '000000000000000000000001' }, numbers: { $eq: [1, 2] } }
        );
        assert.ok(!doc);
      });
    });
  });

  it('does not apply string schema setters on $regex (gh-11426)', async function() {
    const numbersOnlyRE = /[^\d]+/g;
    const getOnlyNumbers = string => string.replace(numbersOnlyRE, '');

    const testSchema = new Schema({
      testProp: {
        type: String,
        required: true,
        set: getOnlyNumbers
      }
    }, { strictQuery: false });

    const Test = db.model('Test', testSchema);

    await Test.collection.insertOne({ testProp: 'not numbers' });

    const res = await Test.find({ testProp: /^not numbers$/ });
    assert.equal(res.length, 1);
    assert.equal(res[0].testProp, 'not numbers');

    res[0].testProp = 'something else 42';
    assert.strictEqual(res[0].testProp, '42');
  });
});
