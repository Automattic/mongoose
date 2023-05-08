'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const CastError = mongoose.Error.CastError;

describe('model: updateOne:', function() {
  let post;
  const title = 'Tobi';
  const author = 'Brian';
  const newTitle = 'Woot';
  let id0;
  let id1;
  let Comments;
  let BlogPost;
  let db;

  before(function() {
    db = start();
  });

  beforeEach(function() {
    Comments = new Schema({});

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    const schema = new Schema({
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
    }, { strict: false });

    schema.virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    schema.method('cool', function() {
      return this;
    });

    schema.static('woot', function() {
      return this;
    });

    BlogPost = db.model('BlogPost', schema);
  });

  after(async function() {
    await db.close();
  });

  beforeEach(function() {
    id0 = new DocumentObjectId();
    id1 = new DocumentObjectId();

    post = new BlogPost();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    return post.save();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('works', async function() {
    const cf = await BlogPost.findById(post._id);
    assert.equal(cf.title, title);
    assert.equal(cf.author, author);
    assert.equal(cf.meta.visitors.valueOf(), 0);
    assert.equal(cf.date.toString(), post.date.toString());
    assert.equal(cf.published, true);
    assert.equal(cf.mixed.x, 'ex');
    assert.deepEqual(cf.numbers.toObject(), [4, 5, 6, 7]);
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

    await BlogPost.updateOne({ title: title }, update);
    let up = await BlogPost.findById(post._id);
    assert.equal(up.title, newTitle);
    assert.equal(up.author, author);
    assert.equal(up.meta.visitors.valueOf(), 2);
    assert.equal(up.date.toString(), update.$set.date.toString());
    assert.equal(up.published, false);
    assert.equal(up.mixed.x, 'ECKS');
    assert.equal(up.mixed.y, 'why');
    assert.deepEqual(up.numbers.toObject(), [5, 7]);
    assert.equal(up.owners.length, 1);
    assert.equal(up.owners[0].toString(), id1.toString());
    assert.equal(up.comments[0].body, 'been there');
    assert.equal(up.comments[1].body, '8');
    assert.ok(up.comments[0]._id);
    assert.ok(up.comments[1]._id);
    assert.ok(up.comments[0]._id instanceof DocumentObjectId);
    assert.ok(up.comments[1]._id instanceof DocumentObjectId);

    const update2 = {
      'comments.body': 'fail'
    };

    let err = await BlogPost.updateOne({ _id: post._id }, update2).then(() => null, err => err);
    assert.ok(err.message.length > 0);
    await BlogPost.findById(post);

    const update3 = {
      $pull: 'fail'
    };

    err = await BlogPost.updateOne({ _id: post._id }, update3).then(() => null, err => err);
    assert.ok(err);

    assert.ok(/Invalid atomic update value for \$pull\. Expected an object, received string/.test(err.message));

    const update4 = {
      $inc: { idontexist: 1 }
    };

    // should not overwrite doc when no valid paths are submitted
    await BlogPost.updateOne({ _id: post._id }, update4);

    up = await BlogPost.findById(post._id);

    assert.equal(up.title, newTitle);
    assert.equal(up.author, author);
    assert.equal(up.meta.visitors.valueOf(), 2);
    assert.equal(up.date.toString(), update.$set.date.toString());
    assert.equal(up.published, false);
    assert.equal(up.mixed.x, 'ECKS');
    assert.equal(up.mixed.y, 'why');
    assert.deepEqual(up.numbers.toObject(), [5, 7]);
    assert.equal(up.owners.length, 1);
    assert.equal(up.owners[0].toString(), id1.toString());
    assert.equal(up.comments[0].body, 'been there');
    assert.equal(up.comments[1].body, '8');
    // non-schema data was still stored in mongodb
    assert.strictEqual(1, up._doc.idontexist);
  });

  it('casts doc arrays', async function() {
    const update = {
      comments: [{ body: 'worked great' }],
      $set: { 'numbers.1': 100 },
      $inc: { idontexist: 1 }
    };

    await BlogPost.updateOne({ _id: post._id }, update);

    // get the underlying doc
    const doc = await BlogPost.collection.findOne({ _id: post._id });

    const up = new BlogPost();
    up.init(doc);
    assert.equal(up.comments.length, 1);
    assert.equal(up.comments[0].body, 'worked great');
    assert.strictEqual(true, !!doc.comments[0]._id);
  });

  it('makes copy of conditions and update options', async function() {
    const conditions = { _id: post._id.toString() };
    const update = { $set: { some_attrib: post._id.toString() } };
    await BlogPost.updateOne(conditions, update);
    assert.equal(typeof conditions._id, 'string');

  });

  it('$addToSet with $ (gh-479)', async function() {
    function a() {
    }

    a.prototype.toString = function() {
      return 'MongoDB++';
    };
    const crazy = new a();

    const update = {
      $addToSet: { 'comments.$.comments': { body: 'The Ring Of Power' } },
      $set: { 'comments.$.title': crazy }
    };

    await BlogPost.updateOne({ _id: post._id, 'comments.body': 'been there' }, update);
    const ret = await BlogPost.findById(post);
    assert.equal(ret.comments.length, 2);
    assert.equal(ret.comments[0].body, 'been there');
    assert.equal(ret.comments[0].title, 'MongoDB++');
    assert.strictEqual(true, !!ret.comments[0].comments);
    assert.equal(ret.comments[0].comments.length, 1);
    assert.strictEqual(ret.comments[0].comments[0].body, 'The Ring Of Power');
  });

  describe('using last', function() {
    let last;

    beforeEach(async function() {
      const doc = await BlogPost.findOne({ 'owners.1': { $exists: true } });
      last = doc;
    });

    it('handles date casting (gh-479)', async function() {
      const update = {
        $inc: { 'comments.$.newprop': '1' },
        $set: { date: (new Date()).getTime() } // check for single val casting
      };

      await BlogPost.updateOne({ _id: post._id, 'comments.body': 'been there' }, update, { strict: false });
      const ret = await BlogPost.findById(post);
      assert.equal(ret._doc.comments[0]._doc.newprop, 1);
      assert.strictEqual(undefined, ret._doc.comments[1]._doc.newprop);
      assert.ok(ret.date instanceof Date);
      assert.equal(ret.date.toString(), new Date(update.$set.date).toString());
    });

    it('handles $addToSet (gh-545)', async function() {
      const owner = last.owners[0];
      assert.ok(owner);
      const numOwners = last.owners.length;
      const update = {
        $addToSet: { owners: owner }
      };

      await BlogPost.updateOne({ _id: last._id }, update);

      const ret = await BlogPost.findById(last);

      assert.equal(ret.owners.length, numOwners);
      assert.equal(ret.owners[0].toString(), owner.toString());
    });

    it('handles $addToSet with $each (gh-545)', async function() {
      const owner = post.owners[0];
      const newowner = new DocumentObjectId();
      const numOwners = post.owners.length;

      const update = {
        $addToSet: { owners: { $each: [owner, newowner] } }
      };

      await BlogPost.updateOne({ _id: post._id }, update);

      const ret = await BlogPost.findById(post);

      assert.equal(ret.owners.length, numOwners + 1);
      assert.equal(ret.owners[0].toString(), owner.toString());
      assert.equal(ret.owners[2].toString(), newowner.toString());
    });

    it('handles $pop and $unset (gh-574)', async function() {
      const update = {
        $pop: { owners: -1 },
        $unset: { title: 1 }
      };

      await BlogPost.updateOne({ _id: post._id }, update);

      const ret = await BlogPost.findById(post);

      assert.equal(ret.owners.length, 1);
      assert.equal(ret.owners[0].toString(), post.owners[1].toString());
      assert.strictEqual(ret.title, undefined);
    });
  });

  it('works with nested positional notation', async function() {
    const update = {
      $set: {
        'comments.0.comments.0.date': '11/5/2011',
        'comments.1.body': 9000
      }
    };

    await BlogPost.updateOne({ _id: post._id }, update);

    const ret = await BlogPost.findById(post);
    assert.equal(ret.comments.length, 2);
    assert.equal(ret.comments[0].body, 'been there');
    assert.equal(ret.comments[1].body, '9000');
    assert.equal(ret.comments[0].comments[0].date.toString(), new Date('11/5/2011').toString());
    assert.equal(ret.comments[1].comments.length, 0);

  });

  it('handles $pull with obj literal (gh-542)', async function() {
    const doc = await BlogPost.findById(post);

    const update = {
      $pull: { comments: { _id: doc.comments[0].id } }
    };

    await BlogPost.updateOne({ _id: post._id }, update);

    const ret = await BlogPost.findById(post);
    assert.equal(ret.comments.length, 1);
    assert.equal(ret.comments[0].body, 'done that');
  });

  it('handles $pull of obj literal and nested $in', async function() {
    const update = {
      $pull: { comments: { body: { $in: ['been there'] } } }
    };

    await BlogPost.updateOne({ _id: post._id }, update);
    const ret = await BlogPost.findById(post);
    assert.equal(ret.comments.length, 1);
    assert.equal(ret.comments[0].body, 'done that');
  });

  it('handles $pull and nested $nin', async function() {
    const doc = await BlogPost.findById(post);

    doc.comments.push({ body: 'hi' }, { body: 'there' });
    await doc.save();
    let ret = await BlogPost.findById(doc);
    assert.equal(ret.comments.length, 4);

    const update = {
      $pull: { comments: { body: { $nin: ['there'] } } }
    };

    await BlogPost.updateOne({ _id: ret._id }, update);
    ret = await BlogPost.findById(post);
    assert.equal(ret.comments.length, 1);
    assert.equal(ret.comments[0].body, 'there');

  });

  it('updates numbers atomically', async function() {
    const post = new BlogPost();
    post.set('meta.visitors', 5);

    await post.save();
    await Promise.all(Array(4).fill(null).map(() => {
      return BlogPost.updateOne({ _id: post._id }, { $inc: { 'meta.visitors': 1 } });
    }));

    const doc = await BlogPost.findOne({ _id: post.get('_id') });
    assert.equal(doc.get('meta.visitors'), 9);
  });

  it('passes number of affected docs', async function() {
    await BlogPost.deleteMany({});
    await BlogPost.create({ title: 'one' }, { title: 'two' }, { title: 'three' });

    const res = await BlogPost.updateMany({}, { title: 'newtitle' });
    assert.equal(res.modifiedCount, 3);
  });

  it('updates a number to null (gh-640)', async function() {
    const B = BlogPost;
    let b = new B({ meta: { visitors: null } });
    await b.save();
    b = await B.findById(b);
    assert.strictEqual(b.meta.visitors, null);

    await B.updateOne({ _id: b._id }, { meta: { visitors: null } });
  });

  it('handles $pull from Mixed arrays (gh-735)', async function() {
    const schema = new Schema({ comments: [] });
    const M = db.model('Test', schema);
    const doc = await M.create({ comments: [{ name: 'node 0.8' }] });
    const affected = await M.updateOne({ _id: doc._id }, { $pull: { comments: { name: 'node 0.8' } } });
    assert.equal(affected.modifiedCount, 1);
  });

  it('handles $push with $ positionals (gh-1057)', async function() {
    const taskSchema = new Schema({
      name: String
    });

    const componentSchema = new Schema({
      name: String,
      tasks: [taskSchema]
    });

    const projectSchema = new Schema({
      name: String,
      components: [componentSchema]
    });

    const Project = db.model('Test', projectSchema);

    const project = await Project.create({ name: 'my project' });
    const pid = project.id;
    const comp = project.components.create({ name: 'component' });
    await Project.updateOne({ _id: pid }, { $push: { components: comp } });

    const task = comp.tasks.create({ name: 'my task' });
    await Project.updateOne({ _id: pid, 'components._id': comp._id }, { $push: { 'components.$.tasks': task } });
    const proj = await Project.findById(pid);
    assert.ok(proj);
    assert.equal(proj.components.length, 1);
    assert.equal(proj.components[0].name, 'component');
    assert.equal(comp.id, proj.components[0].id);
    assert.equal(proj.components[0].tasks.length, 1);
    assert.equal(proj.components[0].tasks[0].name, 'my task');
    assert.equal(task.id, proj.components[0].tasks[0].id);
  });

  it('handles nested paths starting with numbers (gh-1062)', async function() {
    const schema = new Schema({ counts: Schema.Types.Mixed });
    const M = db.model('Test', schema);
    const m = await M.create({ counts: {} });
    await M.updateOne({}, { $inc: { 'counts.1': 1, 'counts.1a': 10 } });
    const doc = await M.findById(m);
    assert.equal(doc.counts['1'], 1);
    assert.equal(doc.counts['1a'], 10);
  });

  it('handles positional operators with referenced docs (gh-1572)', async function() {
    const so = new Schema({ title: String, obj: [String] });
    const Some = db.model('Test', so);

    const s = await Some.create({ obj: ['a', 'b', 'c'] });
    await Some.updateOne({ _id: s._id, obj: 'b' }, { $set: { 'obj.$': 2 } });

    const ss = await Some.findById(s._id);

    assert.strictEqual(ss.obj[1], '2');
  });

  it('use .where for update condition (gh-2170)', async function() {
    const so = new Schema({ num: Number });
    const Some = db.model('Test', so);

    const docs = await Some.create([{ num: 1 }, { num: 1 }]);
    assert.equal(docs.length, 2);
    let doc0 = docs[0];
    let doc1 = docs[1];
    const sId0 = doc0._id;
    const sId1 = doc1._id;
    const cnt = await Some.where({ _id: sId0 }).updateOne({}, { $set: { num: '99' } }, { multi: true });
    assert.equal(cnt.modifiedCount, 1);
    doc0 = await Some.findById(sId0);

    assert.equal(doc0.num, 99);
    doc1 = await Some.findById(sId1);

    assert.equal(doc1.num, 1);
  });

  describe('mongodb 2.4 features', function() {
    it('$setOnInsert operator', async function() {

      const schema = new Schema({ name: String, age: Number, x: String });
      const M = db.model('Test', schema);

      let match = { name: 'set on insert' };
      let op = { $setOnInsert: { age: '47' }, x: 'inserted' };
      await M.updateOne(match, op, { upsert: true });
      let doc = await M.findOne();
      assert.equal(doc.age, 47);
      assert.equal(doc.name, 'set on insert');

      match = { name: 'set on insert' };
      op = { $setOnInsert: { age: 108 }, name: 'changed' };
      await M.updateOne(match, op, { upsert: true });

      doc = await M.findOne();
      assert.equal(doc.age, 47);
      assert.equal(doc.name, 'changed');
    });

    it('push with $slice', async function() {
      const schema = new Schema({ name: String, n: [{ x: Number }] });
      const M = db.model('Test', schema);

      const created = await M.create({ name: '2.4' });
      let op = {
        $push: {
          n: {
            $each: [{ x: 10 }, { x: 4 }, { x: 1 }],
            $slice: '-1',
            $sort: { x: 1 }
          }
        }
      };

      await M.updateOne({ _id: created._id }, op);

      let doc = await M.findById(created._id);
      assert.equal(created.id, doc.id);
      assert.equal(doc.n.length, 1);
      assert.equal(doc.n[0].x, 10);

      op = {
        $push: {
          n: {
            $each: [],
            $slice: 0
          }
        }
      };
      await M.updateOne({ _id: created._id }, op);

      doc = await M.findById(created._id);
      assert.equal(doc.n.length, 0);

    });
  });

  describe('mongodb 2.6 features', function() {
    it('supports $position', async function() {

      const schema = new Schema({ name: String, n: [{ x: Number }] });
      const M = db.model('Test', schema);

      let m = new M({ name: '2.6', n: [{ x: 0 }] });
      await m.save();
      assert.equal(m.n.length, 1);
      await M.updateOne(
        { name: '2.6' },
        { $push: { n: { $each: [{ x: 2 }, { x: 1 }], $position: 0 } } }
      );
      m = await M.findOne({ name: '2.6' });
      assert.equal(m.n.length, 3);
      assert.equal(m.n[0].x, 2);
      assert.equal(m.n[1].x, 1);
      assert.equal(m.n[2].x, 0);

    });

    it('supports $currentDate', async function() {

      const schema = new Schema({ name: String, lastModified: Date, lastModifiedTS: Date });
      const M = db.model('Test', schema);

      let m = new M({ name: '2.6' });
      await m.save();
      const before = Date.now();
      await M.updateOne(
        { name: '2.6' },
        { $currentDate: { lastModified: true, lastModifiedTS: { $type: 'timestamp' } } }
      );

      m = await M.findOne({ name: '2.6' });
      const after = Date.now();
      assert.ok(m.lastModified.getTime() >= before);
      assert.ok(m.lastModified.getTime() <= after);

    });
  });

  it('casts empty arrays', async function() {
    const so = new Schema({ arr: [] });
    const Some = db.model('Test', so);

    const s = await Some.create({ arr: ['a'] });


    await Some.updateOne({ _id: s._id }, { arr: [] });
    const doc = await Some.findById(s._id);
    assert.ok(Array.isArray(doc.arr));
    assert.strictEqual(0, doc.arr.length);
  });

  describe('defaults and validators (gh-860)', function() {
    it('applies defaults on upsert', async function() {
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);
      const updateOptions = { upsert: true };
      await Breakfast.updateOne({}, { base: 'eggs' }, updateOptions);

      const breakfast = await Breakfast.findOne({}).lean().exec();
      assert.equal(breakfast.base, 'eggs');
      assert.equal(breakfast.topping, 'bacon');

    });

    it('avoids nested paths if setting parent path (gh-4911)', function(done) {
      const EmbeddedSchema = mongoose.Schema({
        embeddedField: String
      });

      const ParentSchema = mongoose.Schema({
        embedded: EmbeddedSchema
      });

      const Parent = db.model('Parent', ParentSchema);

      const newDoc = {
        _id: new mongoose.Types.ObjectId(),
        embedded: null
      };

      const opts = { upsert: true };

      Parent.
        findOneAndUpdate({ _id: newDoc._id }, newDoc, opts).
        then(function() { done(); }).
        catch(done);
    });

    it('doesnt set default on upsert if query sets it', async function() {
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true };
      await Breakfast.updateOne({ topping: 'sausage' }, { base: 'eggs' }, updateOptions);
      const breakfast = await Breakfast.findOne({});
      assert.equal(breakfast.base, 'eggs');
      assert.equal(breakfast.topping, 'sausage');
    });

    it('properly sets default on upsert if query wont set it', async function() {
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true };
      await Breakfast.updateOne({ topping: { $ne: 'sausage' } }, { base: 'eggs' }, updateOptions);
      const breakfast = await Breakfast.findOne({});
      assert.equal(breakfast.base, 'eggs');
      assert.equal(breakfast.topping, 'bacon');

    });

    it('handles defaults on document arrays (gh-4456)', async function() {
      const schema = new Schema({
        arr: {
          type: [new Schema({ name: String }, { _id: false })],
          default: [{ name: 'Val' }]
        }
      });

      const M = db.model('Test', schema);

      const opts = { upsert: true };
      await M.updateOne({}, {}, opts);
      const doc = await M.findOne({});
      assert.deepEqual(doc.toObject().arr, [{ name: 'Val' }]);

    });

    it('runs validators if theyre set', async function() {
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

      const updateOptions = { upsert: true, runValidators: true };
      const error = await Breakfast.updateOne({}, { topping: 'bacon', base: 'eggs' }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.equal(Object.keys(error.errors)[0], 'topping');
      assert.equal(error.errors.topping.message, 'Validator failed for path `topping` with value `bacon`');

      const breakfast = await Breakfast.findOne({});
      assert.ok(!breakfast);

    });

    it('validators handle $unset and $setOnInsert', async function() {
      const s = new Schema({
        steak: { type: String, required: true },
        eggs: {
          type: String,
          validate: function() {
            assert.ok(this instanceof mongoose.Query);
            return false;
          }
        }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      const error = await Breakfast.updateOne({}, { $unset: { steak: '' }, $setOnInsert: { eggs: 'softboiled' } }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 2);
      assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
      assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
      assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
      assert.equal(error.errors.steak.message, 'Path `steak` is required.');

    });

    it('global validators option (gh-6578)', async function() {
      const s = new Schema({
        steak: { type: String, required: true }
      });
      const m = new mongoose.Mongoose();
      const Breakfast = m.model('gh6578', s);

      const updateOptions = { runValidators: true };
      const error = await Breakfast.
        updateOne({}, { $unset: { steak: 1 } }, updateOptions).
        catch(err => err);

      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
    });

    it('min/max, enum, and regex built-in validators work', async function() {
      const s = new Schema({
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      let error = await Breakfast.updateOne({}, { $set: { steak: 'ribeye', eggs: 3, bacon: '3 strips' } }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.equal(Object.keys(error.errors)[0], 'eggs');
      assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

      error = await Breakfast.updateOne({}, { $set: { steak: 'tofu', eggs: 5, bacon: '3 strips' } }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.equal(Object.keys(error.errors)[0], 'steak');
      assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

      error = await Breakfast.updateOne({}, { $set: { steak: 'sirloin', eggs: 6, bacon: 'none' } }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.equal(Object.keys(error.errors)[0], 'bacon');
      assert.equal(error.errors.bacon.message, 'Path `bacon` is invalid (none).');


    });

    it('multiple validation errors', async function() {
      const s = new Schema({
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      const error = await Breakfast.updateOne({}, { $set: { steak: 'tofu', eggs: 2, bacon: '3 strips' } }, updateOptions).then(() => null, err => err);
      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 2);
      assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
      assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
    });

    it('validators ignore $inc', async function() {
      const s = new Schema({
        steak: { type: String, required: true },
        eggs: { type: Number, min: 4 }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      await Breakfast.updateOne({}, { $inc: { eggs: 1 } }, updateOptions);

    });

    it('validators handle positional operator (gh-3167)', async function() {
      const s = new Schema({
        toppings: [{ name: { type: String, enum: ['bacon', 'cheese'] } }]
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      const error = await Breakfast.updateOne(
        { 'toppings.name': 'bacon' },
        { 'toppings.$.name': 'tofu' },
        updateOptions
      ).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.errors['toppings.0.name']);
    });

    it('validators handle arrayFilters (gh-7536)', function() {
      const s = new Schema({
        toppings: [{ name: { type: String, enum: ['bacon', 'cheese'] } }]
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = {
        runValidators: true,
        arrayFilters: [{ 't.name': 'bacon' }]
      };
      return Breakfast.
        updateOne({}, { 'toppings.$[t].name': 'tofu' }, updateOptions).
        then(
          () => assert.ok(false),
          err => {
            assert.ok(err);
            assert.equal(Object.keys(err.errors).length, 1);
            assert.ok(/toppings.*name/.test(Object.keys(err.errors)[0]));
          });
    });

    it('required and single nested (gh-4479)', async function() {
      const FileSchema = new Schema({
        name: {
          type: String,
          required: true
        }
      });

      const CompanySchema = new Schema({
        file: FileSchema
      });

      const Company = db.model('Test', CompanySchema);
      const update = { file: { name: '' } };
      const options = { runValidators: true };
      const error = await Company.updateOne({}, update, options).then(() => null, err => err);
      assert.equal(error.errors['file.name'].message,
        'Path `name` is required.');
    });
  });

  it('works with $set and overwrite (gh-2515)', async function() {
    const schema = new Schema({ breakfast: String });
    const M = db.model('Test', schema);

    let doc = await M.create({ breakfast: 'bacon' });
    await M.updateOne(
      { _id: doc._id },
      { $set: { breakfast: 'eggs' } },
      { overwrite: true }
    );

    doc = await M.findOne({ _id: doc._id });
    assert.equal(doc.breakfast, 'eggs');

  });

  it('successfully casts set with nested mixed objects (gh-2796)', async function() {
    const schema = new Schema({ breakfast: {} });
    const M = db.model('Test', schema);

    let doc = await M.create({});
    const result = await M.updateOne(
      { _id: doc._id },
      { breakfast: { eggs: 2, bacon: 3 } }
    );
    assert.equal(result.modifiedCount, 1);
    doc = await M.findOne({ _id: doc._id });
    assert.equal(doc.breakfast.eggs, 2);

  });

  it('handles empty update with promises (gh-2796)', async function() {
    const schema = new Schema({ eggs: Number });
    const M = db.model('Test', schema);

    const doc = await M.create({});
    return M.updateOne({ _id: doc._id }, { notInSchema: 1 }).exec();
  });

  describe('middleware', function() {
    it('can specify pre and post hooks', async function() {
      let numPres = 0;
      let numPosts = 0;
      const band = new Schema({ members: [String] });
      band.pre('updateOne', function(next) {
        ++numPres;
        next();
      });
      band.post('updateOne', function() {
        ++numPosts;
      });
      const Band = db.model('Band', band);

      const gnr = new Band({ members: ['Axl', 'Slash', 'Izzy', 'Duff', 'Adler'] });
      await gnr.save();

      assert.equal(numPres, 0);
      assert.equal(numPosts, 0);
      await Band.updateOne(
        { _id: gnr._id },
        { $pull: { members: 'Adler' } }
      );
      assert.equal(numPres, 1);
      assert.equal(numPosts, 1);
      const doc = await Band.findOne({ _id: gnr._id });
      assert.deepEqual(['Axl', 'Slash', 'Izzy', 'Duff'],
        doc.toObject().members);

    });

    it('runs before validators (gh-2706)', async function() {
      const bandSchema = new Schema({
        lead: { type: String, enum: ['Axl Rose'] }
      });
      bandSchema.pre('updateOne', function() {
        this.options.runValidators = true;
      });
      const Band = db.model('Band', bandSchema);

      const err = await Band.updateOne({}, { $set: { lead: 'Not Axl' } }).then(() => null, err => err);
      assert.ok(err);
    });

    describe('objects and arrays', function() {
      it('embedded objects (gh-2706)', async function() {
        const bandSchema = new Schema({
          singer: {
            firstName: { type: String, enum: ['Axl'] },
            lastName: { type: String, enum: ['Rose'] }
          }
        });
        bandSchema.pre('updateOne', function() {
          this.options.runValidators = true;
        });
        const Band = db.model('Band', bandSchema);

        const err = await Band.updateOne(
          {},
          { $set: { singer: { firstName: 'Not', lastName: 'Axl' } } }
        ).then(() => null, err => err);
        assert.ok(err);
      });

      it('handles document array validation (gh-2733)', async function() {
        const member = new Schema({
          name: String,
          role: { type: String, required: true, enum: ['singer', 'guitar', 'drums', 'bass'] }
        });
        const band = new Schema({ members: [member], name: String });
        const Band = db.model('Band', band);
        const members = [
          { name: 'Axl Rose', role: 'singer' },
          { name: 'Slash', role: 'guitar' },
          { name: 'Christopher Walken', role: 'cowbell' }
        ];

        const err = await Band.findOneAndUpdate(
          { name: 'Guns N\' Roses' },
          { $set: { members: members } },
          { runValidators: true })
          .then(() => null, err => err);

        assert.ok(err);
      });

      it('validators on arrays (gh-3724)', async function() {
        const schema = new Schema({
          arr: [String]
        });

        schema.path('arr').validate(function() {
          return false;
        });

        const M = db.model('Test', schema);
        const options = { runValidators: true };
        const error = await M.findOneAndUpdate({}, { arr: ['test'] }, options).then(() => null, err => err);
        assert.ok(/ValidationError/.test(error.toString()));
      });
    });
  });

  it('works with undefined date (gh-2833)', async function() {
    const dateSchema = {
      d: Date
    };
    const D = db.model('Test', dateSchema);

    await D.updateOne({}, { d: undefined });
  });

  describe('set() (gh-5770)', function() {
    it('works with middleware and doesn\'t change the op', function() {
      const schema = new Schema({ name: String, updatedAt: Date });
      const date = new Date();
      schema.pre('updateOne', function() {
        this.set('updatedAt', date);
      });
      const M = db.model('Test', schema);

      return M.updateOne({}, { name: 'Test' }, { upsert: true }).
        then(() => M.findOne()).
        then(doc => {
          assert.equal(doc.updatedAt.valueOf(), date.valueOf());
        });
    });

    it('object syntax for path parameter', function() {
      const schema = new Schema({ name: String, updatedAt: Date });
      const date = new Date();
      schema.pre('updateOne', function() {
        this.set({ updatedAt: date });
      });
      const M = db.model('Test', schema);

      return M.updateOne({}, { name: 'Test' }, { upsert: true }).
        then(() => M.findOne()).
        then(doc => {
          assert.equal(doc.updatedAt.valueOf(), date.valueOf());
        });
    });
  });

  it('does not add virtuals to update (gh-2046)', async function() {
    const childSchema = new Schema({ foo: String }, { toObject: { getters: true } });
    const parentSchema = new Schema({ children: [childSchema] });

    childSchema.virtual('bar').get(function() {
      return 'bar';
    });

    const Parent = db.model('Parent', parentSchema);

    const update = Parent.updateOne({}, { $push: { children: { foo: 'foo' } } }, { upsert: true });
    assert.equal(update._update.$push.children.bar, undefined);

    await update.exec();
    const doc = await Parent.findOne({});
    assert.equal(doc.children.length, 1);
    assert.ok(!doc.toObject({ virtuals: false }).children[0].bar);
  });

  it('doesnt modify original argument doc (gh-3008)', async function() {
    const FooSchema = new mongoose.Schema({
      key: Number,
      value: String
    });
    const Model = db.model('Test', FooSchema);

    const update = { $set: { values: 2, value: 2 } };
    await Model.updateOne({ key: 1 }, update);
    assert.equal(update.$set.values, 2);
  });

  describe('bug fixes', function() {
    it('can $rename (gh-1845)', async function() {
      const schema = new Schema({ foo: Date, bar: Date });
      const Model = db.model('Test', schema);

      const update = { $rename: { foo: 'bar' } };
      await Model.create({ foo: Date.now() });
      const res = await Model.updateOne({}, update, { multi: true });
      assert.equal(res.modifiedCount, 1);
    });

    it('allows objects with positional operator (gh-3185)', async function() {
      const schema = new Schema({ children: [{ _id: Number }] });
      const MyModel = db.model('Test', schema);

      let doc = await MyModel.create({ children: [{ _id: 1 }] });
      doc = await MyModel.findOneAndUpdate(
        { _id: doc._id, 'children._id': 1 },
        { $set: { 'children.$': { _id: 2 } } },
        { new: true }
      );

      assert.equal(doc.children[0]._id, 2);
    });

    it('mixed type casting (gh-3305)', async function() {
      const Schema = mongoose.Schema({}, { strict: false });
      const Model = db.model('Test', Schema);

      const m = await Model.create({});
      const res = await Model.
        updateOne({ _id: m._id }, { $push: { myArr: { key: 'Value' } } }).
        exec();
      assert.equal(res.modifiedCount, 1);
    });

    it('replaceOne', async function() {
      const schema = mongoose.Schema({ name: String, age: Number }, {
        versionKey: false
      });
      const Model = db.model('Test', schema);

      const m = await Model.create({ name: 'abc', age: 1 });
      await Model.replaceOne({ name: 'abc' }, { name: 'test' }).exec();
      const doc = await Model.findById(m._id).exec();
      assert.deepEqual(doc.toObject({ virtuals: false }), {
        _id: m._id,
        name: 'test'
      });

    });

    it('mixed nested type casting (gh-3337)', async function() {
      const Schema = mongoose.Schema({ attributes: {} }, { strict: true });
      const Model = db.model('Test', Schema);

      const m = await Model.create({});
      const update = { $push: { 'attributes.scores.bar': { a: 1 } } };
      const res = await Model.
        updateOne({ _id: m._id }, update).
        exec();
      assert.equal(res.modifiedCount, 1);
      const doc = await Model.findById(m._id);
      assert.equal(doc.attributes.scores.bar.length, 1);
    });

    it('with single nested (gh-3820)', async function() {
      const child = new mongoose.Schema({
        item2: {
          item3: String,
          item4: String
        }
      });

      const parentSchema = new mongoose.Schema({
        name: String,
        item1: child
      });

      const Parent = db.model('Parent', parentSchema);

      let doc = await Parent.create({ name: 'test' });
      const update = { 'item1.item2': { item3: 'test1', item4: 'test2' } };
      await doc.updateOne(update);
      doc = await Parent.findOne({ _id: doc._id });
      assert.equal(doc.item1.item2.item3, 'test1');
      assert.equal(doc.item1.item2.item4, 'test2');
    });

    it('with single nested and transform (gh-4621)', async function() {
      const SubdocSchema = new Schema({
        name: String
      }, {
        toObject: {
          transform: function(doc, ret) {
            ret.id = ret._id.toString();
            delete ret._id;
          }
        }
      });

      const CollectionSchema = new Schema({
        field2: SubdocSchema
      });

      const Collection = db.model('Test', CollectionSchema);

      let doc = await Collection.create({});
      const update = { field2: { name: 'test' } };
      await Collection.updateOne({ _id: doc._id }, update);

      doc = await Collection.collection.findOne({ _id: doc._id });
      assert.ok(doc.field2._id);
      assert.ok(!doc.field2.id);

    });

    it('works with buffers (gh-3496)', async function() {
      const Schema = mongoose.Schema({ myBufferField: Buffer });
      const Model = db.model('Test', Schema);

      await Model.updateOne({}, { myBufferField: Buffer.alloc(1) });

    });

    it('.updateOne(doc) (gh-3221)', function() {
      const Schema = mongoose.Schema({ name: String });
      const Model = db.model('Test', Schema);

      let query = Model.updateOne({ name: 'Val' });
      assert.equal(query.getUpdate().name, 'Val');

      query = Model.find().updateOne({ name: 'Val' });
      assert.equal(query.getUpdate().name, 'Val');

      return query.setOptions({ upsert: true }).
        then(() => Model.findOne()).
        then(doc => {
          assert.equal(doc.name, 'Val');
        });
    });

    it('middleware update with exec (gh-3549)', async function() {
      const Schema = mongoose.Schema({ name: String });

      Schema.pre('updateOne', function(next) {
        this.updateOne({ name: 'Val' });
        next();
      });

      const Model = db.model('Test', Schema);

      let doc = await Model.create({});
      await Model.updateOne({ _id: doc._id }, { name: 'test' }).exec();
      doc = await Model.findOne({ _id: doc._id });
      assert.equal(doc.name, 'Val');
    });

    it('casting $push with overwrite (gh-3564)', async function() {
      const schema = mongoose.Schema({
        topicId: Number,
        name: String,
        followers: [Number]
      });

      let doc = {
        topicId: 100,
        name: 'name',
        followers: [500]
      };

      const M = db.model('Test', schema);

      await M.create(doc);

      const update = { $push: { followers: 200 } };
      const opts = { overwrite: true, new: true, upsert: false, multi: false };

      await M.updateOne({ topicId: doc.topicId }, update, opts);
      doc = await M.findOne({ topicId: doc.topicId });
      assert.equal(doc.name, 'name');
      assert.deepEqual(doc.followers.toObject(), [500, 200]);

    });

    it('$push with buffer doesnt throw error (gh-3890)', async function() {
      const InfoSchema = new Schema({
        prop: { type: Buffer }
      });

      const ModelASchema = new Schema({
        infoList: { type: [InfoSchema] }
      });

      const ModelA = db.model('Test', ModelASchema);

      const propValue = Buffer.from('aa267824dc1796f265ab47870e279780', 'base64');

      const update = {
        $push: {
          info_list: { prop: propValue }
        }
      };

      await ModelA.updateOne({}, update);

    });

    it('$set with buffer (gh-3961)', async function() {
      const schema = {
        name: Buffer
      };

      const Model = db.model('Test', schema);

      const value = Buffer.from('aa267824dc1796f265ab47870e279780', 'base64');
      const instance = new Model({ name: null });

      await instance.save();

      const query = { _id: instance._id };
      const update = { $set: { name: value } };

      return Model.updateOne(query, update);
    });

    it('versioning with setDefaultsOnInsert (gh-2593)', async function() {
      const schema = new Schema({
        num: Number,
        arr: [{ num: Number }]
      });

      const Model = db.model('Test', schema);
      const update = { $inc: { num: 1 }, $push: { arr: { num: 5 } } };
      const options = {
        upsert: true,
        new: true,
        runValidators: true
      };
      await Model.updateOne({}, update, options);


    });

    it('updates with timestamps with $set (gh-4989) (gh-7152)', async function() {
      const TagSchema = new Schema({
        name: String,
        tags: [String]
      }, { timestamps: true });

      const Tag = db.model('Test', TagSchema);

      await Tag.create({ name: 'test' });

      // Test update()
      let start = Date.now();
      await delay(10);

      await Tag.updateOne({}, { $set: { tags: ['test1'] } });

      let tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test updateOne()
      start = Date.now();
      await delay(10);

      await Tag.updateOne({}, { $set: { tags: ['test1'] } });

      tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test updateMany()
      start = Date.now();
      await delay(10);

      await Tag.updateMany({}, { $set: { tags: ['test1'] } });

      tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test replaceOne
      start = Date.now();
      await delay(10);

      await Tag.replaceOne({}, { name: 'test', tags: ['test1'] });

      tag = await Tag.findOne();
      assert.ok(tag.createdAt.valueOf() > start);
      assert.ok(tag.updatedAt.valueOf() > start);
    });

    it('lets $currentDate go through with updatedAt (gh-5222)', async function() {
      const testSchema = new Schema({
        name: String
      }, { timestamps: true });

      const Test = db.model('Test', testSchema);

      await Test.create({ name: 'test' });
      const u = { $currentDate: { updatedAt: true }, name: 'test2' };
      await Test.updateOne({}, u);


    });

    it('update validators on single nested (gh-4332)', async function() {
      const AreaSchema = new Schema({
        a: String
      });

      const CompanySchema = new Schema({
        area: {
          type: AreaSchema,
          validate: {
            validator: function() {
              return false;
            },
            message: 'Not valid Area'
          }
        }
      });

      const Company = db.model('Company', CompanySchema);

      const update = {
        area: {
          a: 'Helo'
        }
      };

      const opts = {
        runValidators: true
      };

      const error = await Company.updateOne({}, update, opts).then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.errors['area'].message, 'Not valid Area');

    });

    it('updates child schema timestamps with $push (gh-4049)', async function() {
      let opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      const childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      }, opts);

      const Parent = db.model('Parent', parentSchema);

      const b2 = new Parent();
      const doc = await b2.save();
      const query = { _id: doc._id };
      const update = { $push: { children: { senderId: '234' } } };
      opts = { new: true };
      const res = await Parent.findOneAndUpdate(query, update, opts);
      assert.equal(res.children.length, 1);
      assert.equal(res.children[0].senderId, '234');
      assert.ok(res.children[0].createdAt);
      assert.ok(res.children[0].updatedAt);
    });

    it('updates child schema timestamps with $set (gh-4049)', async function() {
      let opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      const childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      const parentSchema = new mongoose.Schema({
        children: [childSchema],
        child: childSchema
      }, opts);

      const Parent = db.model('Parent', parentSchema);

      const b2 = new Parent();
      const doc = await b2.save();
      const query = { _id: doc._id };
      const update = {
        $set: {
          children: [{ senderId: '234' }],
          child: { senderId: '567' }
        }
      };
      opts = { new: true };
      const res = await Parent.findOneAndUpdate(query, update, opts).exec();
      assert.equal(res.children.length, 1);
      assert.equal(res.children[0].senderId, '234');
      assert.ok(res.children[0].createdAt);
      assert.ok(res.children[0].updatedAt);

      assert.ok(res.child.createdAt);
      assert.ok(res.child.updatedAt);

    });

    it('handles positional operator with timestamps (gh-4418)', async function() {
      const schema = new Schema({
        thing: [{
          thing2: { type: String },
          test: String
        }]
      }, { timestamps: true });

      const Model = db.model('Test', schema);
      const query = { 'thing.thing2': 'test' };
      const update = { $set: { 'thing.$.test': 'test' } };
      await Model.updateOne(query, update);


    });

    it('push with timestamps (gh-4514)', async function() {
      const sampleSchema = new mongoose.Schema({
        sampleArray: [{
          values: [String]
        }]
      }, { timestamps: true });

      const sampleModel = db.model('Test', sampleSchema);
      const newRecord = new sampleModel({
        sampleArray: [{ values: ['record1'] }]
      });

      await newRecord.save();

      await sampleModel.updateOne({ 'sampleArray.values': 'record1' }, {
        $push: { 'sampleArray.$.values': 'another record' }
      },
      { runValidators: true }
      );
    });

    it('addToSet (gh-4953)', async function() {
      const childSchema = new mongoose.Schema({
        name: {
          type: String,
          required: true
        },
        lastName: {
          type: String,
          required: true
        }
      });

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      });

      const Model = db.model('Test', parentSchema);

      const update = {
        $addToSet: { children: { name: 'Test' } }
      };
      const opts = { new: true, runValidators: true };
      const error = await Model.findOneAndUpdate({}, update, opts).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.errors['children.lastName']);

    });

    it('overwrite with timestamps (gh-4054)', async function() {
      const testSchema = new Schema({
        user: String,
        something: Number
      }, { timestamps: true });

      const TestModel = db.model('Test', testSchema);
      const options = { upsert: true };
      const update = {
        user: 'John',
        something: 1
      };

      await TestModel.replaceOne({ user: 'test' }, update, options);
      const doc = await TestModel.findOne({});
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);

    });

    it('update with buffer and exec (gh-4609)', async function() {
      const arrSchema = new Schema({
        ip: mongoose.SchemaTypes.Buffer
      });
      const schema = new Schema({
        arr: [arrSchema]
      });

      const M = db.model('Test', schema);

      const m = new M({ arr: [{ ip: Buffer.alloc(1) }] });
      await m.save();
      await m.updateOne({ $push: { arr: { ip: Buffer.alloc(1) } } }).exec();
    });

    it('single nested with runValidators (gh-4420)', async function() {
      const FileSchema = new Schema({
        name: String
      });

      const CompanySchema = new Schema({
        name: String,
        file: FileSchema
      });

      const Company = db.model('Company', CompanySchema);

      await Company.create({ name: 'Booster Fuels' });
      const update = { file: { name: 'new-name' } };
      const options = { runValidators: true };
      await Company.updateOne({}, update, options);
    });

    it('single nested under doc array with runValidators (gh-4960)', function(done) {
      const ProductSchema = new Schema({
        name: String
      });

      const UserSchema = new Schema({
        sell: [{
          product: { type: ProductSchema, required: true }
        }]
      });

      const User = db.model('User', UserSchema);

      User.create({}).
        then(function(user) {
          return User.updateOne({
            _id: user._id
          }, {
            sell: [{
              product: {
                name: 'Product 1'
              }
            }]
          }, {
            runValidators: true
          });
        }).
        // Should not throw
        then(function() {
          done();
        }).
        catch(done);
    });

    it('handles $set on document array in discriminator with runValidators (gh-12518)', async function() {
      const options = { discriminatorKey: 'kind', runValidators: true };

      const countrySchema = new mongoose.Schema({ title: String }, options);
      const areasSubSchema = new mongoose.Schema({ country: [countrySchema] }, options);
      const WorldSchema = new mongoose.Schema({ areas: areasSubSchema }, options);

      const World = db.model(
        'World',
        new mongoose.Schema({ title: String }, options)
      );
      const Earth = World.discriminator('Earth', WorldSchema);

      const data = {
        areas: {
          country: [
            {
              title: 'titlec'
            }
          ]
        }
      };
      await Earth.updateOne(
        { _id: new mongoose.Types.ObjectId() },
        data,
        {
          runValidators: true
        }
      );
    });

    it('single nested schema with geo (gh-4465)', async function() {
      const addressSchema = new Schema({
        geo: { type: [Number], index: '2dsphere' }
      }, { _id: false });
      const containerSchema = new Schema({ address: addressSchema });
      const Container = db.model('Test', containerSchema);

      await Container.updateOne({}, { address: { geo: [-120.24, 39.21] } }).
        exec();
    });

    it('runs validation on Mixed properties of embedded arrays during updates (gh-4441)', async function() {
      const A = new Schema({ str: {} });
      let validateCalls = 0;
      A.path('str').validate(function() {
        ++validateCalls;
        return true;
      });

      let B = new Schema({ a: [A] });

      B = db.model('Test', B);

      await B.findOneAndUpdate(
        { foo: 'bar' },
        { $set: { a: [{ str: { somekey: 'someval' } }] } },
        { runValidators: true }
      );
      assert.equal(validateCalls, 1);
    });

    it('updating single nested doc property casts correctly (gh-4655)', async function() {
      const FileSchema = new Schema({});

      const ProfileSchema = new Schema({
        images: [FileSchema],
        rules: {
          hours: {
            begin: Date,
            end: Date
          }
        }
      });

      const UserSchema = new Schema({
        email: { type: String },
        profiles: [ProfileSchema]
      });


      const User = db.model('User', UserSchema);

      const user = await User.create({ profiles: [] });

      await User.updateOne({ _id: user._id }, { $set: { 'profiles.0.rules': {} } });
      const doc = await User.findOne({ _id: user._id }).lean().exec();
      assert.deepEqual(doc.profiles[0], { rules: {} });
    });

    it('with overwrite and upsert (gh-4749) (gh-5631)', function() {
      const schema = new Schema({
        name: String,
        meta: { age: { type: Number } }
      });
      const User = db.model('User', schema);

      const filter = { name: 'Bar' };
      const update = { name: 'Bar', meta: { age: 33 } };
      const options = { overwrite: true, upsert: true };
      const q2 = User.updateOne(filter, update, options);
      assert.deepEqual(q2.getUpdate(), {
        __v: 0,
        meta: { age: 33 },
        name: 'Bar'
      });

      const q3 = User.findOneAndUpdate(filter, update, options);
      assert.deepEqual(q3.getUpdate(), {
        __v: 0,
        meta: { age: 33 },
        name: 'Bar'
      });
    });

    it('findOneAndUpdate with nested arrays (gh-5032)', async function() {
      const schema = Schema({
        name: String,
        inputs: [[String]] // Array of Arrays of Strings
      });

      const Activity = db.model('Test', schema);

      const q = { name: 'Host Discovery' };
      const u = { inputs: [['ipRange']] };
      const o = { upsert: true };
      await Activity.findOneAndUpdate(q, u, o).exec();
    });

    it('findOneAndUpdate with timestamps (gh-5045)', async function() {
      const schema = new Schema({
        username: String,
        isDeleted: Boolean
      }, { timestamps: true });
      const User = db.model('Test', schema);

      await User.findOneAndUpdate(
        { username: 'test', isDeleted: false },
        { createdAt: '2017-03-06T14:08:59+00:00' },
        { new: true, upsert: true }
      );

      await User.updateOne({ username: 'test' }, { createdAt: new Date() }).
        exec();
    });

    it('doesnt double-call setters when updating an array (gh-5041)', async function() {
      let called = 0;
      const UserSchema = new Schema({
        name: String,
        foos: [{
          _id: false,
          foo: {
            type: Number,
            get: function(val) {
              return val.toString();
            },
            set: function(val) {
              ++called;
              return val;
            }
          }
        }]
      });

      const User = db.model('User', UserSchema);

      await User.findOneAndUpdate({}, { foos: [{ foo: '13.57' }] });
      assert.equal(called, 1);

    });

    it('does not fail if passing whole doc (gh-5088)', function(done) {
      const schema = new Schema({
        username: String,
        x: String
      }, { timestamps: true });
      const User = db.model('User', schema);

      User.create({ username: 'test' }).
        then(function(user) {
          user.x = 'test2';
          return User.findOneAndUpdate({ _id: user._id }, user,
            { new: true });
        }).
        then(function(user) {
          assert.equal(user.x, 'test2');
          done();
        }).
        catch(done);
    });

    it('does not fail if passing whole doc (gh-5111)', function(done) {
      const schema = new Schema({
        fieldOne: String
      }, { strict: true });
      const Test = db.model('Test', schema);

      Test.create({ fieldOne: 'Test' }).
        then(function() {
          const data = { fieldOne: 'Test2', fieldTwo: 'Test3' };
          const opts = {
            upsert: true,
            runValidators: false,
            strict: false
          };
          return Test.updateOne({}, data, opts);
        }).
        then(function() {
          return Test.findOne();
        }).
        then(function(doc) {
          assert.equal(doc.fieldOne, 'Test2');
          assert.equal(doc.get('fieldTwo'), 'Test3');
          done();
        }).
        catch(done);
    });

    it('$pullAll with null (gh-5164)', function() {
      const schema = new Schema({
        name: String,
        arr: [{ name: String }]
      }, { strict: true });
      const Test = db.model('Test', schema);

      const doc = new Test({ name: 'Test', arr: [null, { name: 'abc' }] });

      return doc.save().
        then(function(doc) {
          return Test.updateOne({ _id: doc._id }, {
            $pullAll: { arr: [null] }
          });
        }).
        then(function() {
          return Test.findById(doc);
        }).
        then(function(doc) {
          assert.equal(doc.arr.length, 1);
          assert.equal(doc.arr[0].name, 'abc');
        });
    });

    it('$set array (gh-5403)', function(done) {
      const Schema = new mongoose.Schema({
        colors: [{ type: String }]
      });

      const Model = db.model('Test', Schema);

      Model.create({ colors: ['green'] }).
        then(function() {
          return Model.updateOne({}, { $set: { colors: 'red' } });
        }).
        then(function() {
          return Model.collection.findOne();
        }).
        then(function(doc) {
          assert.deepEqual(doc.colors, ['red']);
          done();
        }).
        catch(done);
    });

    it('doesn\'t skip casting the query on nested arrays (gh-7098)', async function() {
      const nestedSchema = new Schema({
        xyz: [[Number]]
      });
      const schema = new Schema({
        xyz: [[{ type: Number }]],
        nested: nestedSchema
      });

      const Model = db.model('Test', schema);

      const test = new Model({
        xyz: [
          [0, 1],
          [2, 3],
          [4, 5]
        ],
        nested: {
          xyz: [
            [0, 1],
            [2, 3],
            [4, 5]
          ]
        }
      });

      const cond = { _id: test._id };
      const update = { $set: { 'xyz.1.0': '200', 'nested.xyz.1.0': '200' } };
      const opts = { new: true };

      let inserted = await test.save();
      inserted = inserted.toObject();
      assert.deepStrictEqual(inserted.xyz, [[0, 1], [2, 3], [4, 5]]);
      assert.deepStrictEqual(inserted.nested.xyz, [[0, 1], [2, 3], [4, 5]]);
      let updated = await Model.findOneAndUpdate(cond, update, opts);
      updated = updated.toObject();
      assert.deepStrictEqual(updated.xyz, [[0, 1], [200, 3], [4, 5]]);
      assert.deepStrictEqual(updated.nested.xyz, [[0, 1], [200, 3], [4, 5]]);
    });

    it('defaults with overwrite and no update validators (gh-5384)', async function() {
      const testSchema = new mongoose.Schema({
        name: String,
        something: { type: Number, default: 2 }
      });

      const TestModel = db.model('Test', testSchema);
      const options = {
        upsert: true
      };

      const update = { name: 'test' };
      await TestModel.replaceOne({ name: 'a' }, update, options);
      const doc = await TestModel.findOne({});
      assert.equal(doc.something, 2);

    });

    it('update validators with nested required (gh-5269)', async function() {
      const childSchema = new mongoose.Schema({
        d1: {
          type: String,
          required: true
        },
        d2: {
          type: String
        }
      }, { _id: false });

      const parentSchema = new mongoose.Schema({
        d: childSchema
      });

      const Parent = db.model('Parent', parentSchema);

      const error = await Parent.updateOne({}, { d: { d2: 'test' } }, { runValidators: true }).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.errors['d.d1']);
      assert.ok(error.errors['d.d1'].message.indexOf('Path `d1` is required') !== -1,
        error.errors['d.d1'].message);

    });

    it('$push with updateValidators and top-level doc (gh-5430)', async function() {
      const notificationSchema = new mongoose.Schema({
        message: String
      });

      const Notification = db.model('Test', notificationSchema);

      const userSchema = new mongoose.Schema({
        notifications: [notificationSchema]
      });

      const User = db.model('User', userSchema);

      await User.updateOne({}, {
        $push: {
          notifications: {
            $each: [new Notification({ message: 'test' })]
          }
        }
      }, { multi: true, runValidators: true });
    });

    it('$pull with updateValidators (gh-5555)', async function() {
      const notificationSchema = new mongoose.Schema({
        message: {
          type: String,
          maxlength: 12
        }
      });

      const userSchema = new mongoose.Schema({
        notifications: [notificationSchema]
      });

      const User = db.model('User', userSchema);

      const opts = { multi: true, runValidators: true };
      const update = {
        $pull: {
          notifications: {
            message: 'This message is wayyyyyyyyyy too long'
          }
        }
      };
      let doc = await User.create({ notifications: [{ message: 'test' }] });

      const error = await User.updateOne({}, update, opts).exec().then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.errors['notifications.message']);

      update.$pull.notifications.message = 'test';
      await User.updateOne({ _id: doc._id }, update, opts).exec();
      doc = await User.findById(doc._id);
      assert.equal(doc.notifications.length, 0);

    });

    it('$pull with updateValidators and $in (gh-5744)', async function() {
      const exampleSchema = mongoose.Schema({
        subdocuments: [{
          name: String
        }]
      });
      const ExampleModel = db.model('Test', exampleSchema);
      const exampleDocument = {
        subdocuments: [{ name: 'First' }, { name: 'Second' }]
      };

      let doc = await ExampleModel.create(exampleDocument);

      await ExampleModel.updateOne({ _id: doc._id }, {
        $pull: {
          subdocuments: {
            _id: { $in: [doc.subdocuments[0]._id] }
          }
        }
      }, { runValidators: true });
      doc = await ExampleModel.findOne({ _id: doc._id });
      assert.equal(doc.subdocuments.length, 1);

    });

    it('$pull with updateValidators and required array (gh-6341)', function() {
      const RecordingSchema = new Schema({ name: String });

      const ItemSchema = new Schema({
        recordings: {
          type: [RecordingSchema],
          required: true
        }
      });

      const Item = db.model('Test', ItemSchema);

      const opts = { runValidators: true };
      const update = {
        $pull: {
          recordings: {
            _id: '000000000000000000000000'
          }
        }
      };

      // Shouldn't error out
      return Item.findOneAndUpdate({}, update, opts);
    });

    it('update with Decimal type (gh-5361)', async function() {
      const version = await start.mongodVersion();
      const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
      if (!mongo34) {
        return;
      }

      const schema = new mongoose.Schema({
        name: String,
        pricing: [{
          _id: false,
          program: String,
          money: mongoose.Schema.Types.Decimal
        }]
      });

      const Person = db.model('Person', schema);

      const data = {
        name: 'Jack',
        pricing: [
          { program: 'A', money: mongoose.Types.Decimal128.fromString('1.2') },
          { program: 'B', money: mongoose.Types.Decimal128.fromString('3.4') }
        ]
      };

      await Person.create(data);

      const newData = {
        name: 'Jack',
        pricing: [
          { program: 'A', money: mongoose.Types.Decimal128.fromString('5.6') },
          { program: 'B', money: mongoose.Types.Decimal128.fromString('7.8') }
        ]
      };
      await Person.updateOne({ name: 'Jack' }, newData);
    });

    it('strict false in query (gh-5453)', async function() {
      const schema = new mongoose.Schema({
        date: { type: Date, required: true }
      }, { strict: true });

      const Model = db.model('Test', schema);
      const q = { notInSchema: true };
      const u = { $set: { smth: 1 } };
      const o = { strict: false, upsert: true };
      await Model.updateOne(q, u, o);
    });

    it('replaceOne with buffer (gh-6124)', function() {
      const SomeModel = db.model('Test', new Schema({
        name: String,
        binaryProp: Buffer
      }));

      const doc = new SomeModel({
        name: 'test',
        binaryProp: Buffer.alloc(255)
      });

      return doc.save().
        then(function() {
          return SomeModel.replaceOne({ name: 'test' }, {
            name: 'test2',
            binaryProp: Buffer.alloc(255)
          }, { upsert: true });
        });
    });

    it('returns error if passing array as conditions (gh-3677)', async function() {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('Test', schema);
      const error = await Model.updateMany(['foo'], { name: 'bar' }).then(() => null, err => err);
      assert.equal(error.name, 'ObjectParameterError');
      const expected = 'Parameter "filter" to updateMany() must be an object';
      assert.ok(error.message.indexOf(expected) !== -1, error.message);

    });

    it('upsert: 1 (gh-5839)', async function() {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('Test', schema);

      const opts = { upsert: 1 };
      await Model.updateOne({ name: 'Test' }, { name: 'Test2' }, opts);

      const doc = await Model.findOne({});
      assert.equal(doc.name, 'Test2');

    });

    it('casting $addToSet without $each (gh-6086)', function() {
      const schema = new mongoose.Schema({
        numbers: [Number]
      });

      const Model = db.model('Test', schema);

      return Model.create({ numbers: [1, 2] }).
        then(function(doc) {
          return Model.findByIdAndUpdate(
            doc._id,
            { $addToSet: { numbers: [3, 4] } },
            { new: true }
          );
        }).
        then(function(doc) {
          return Model.findById(doc._id);
        }).then(function(doc) {
          assert.deepEqual(doc.toObject().numbers, [1, 2, 3, 4]);
        });
    });

    it('doesn\'t add $each when pushing an array into an array (gh-6768)', async function() {
      const schema = new Schema({
        arr: [[String]]
      });

      const Test = db.model('Test', schema);

      const test = new Test();

      await test.save();
      const cond = { _id: test._id };
      const data = ['one', 'two'];
      const update = { $push: { arr: data } };
      const opts = { new: true };
      const doc = await Test.findOneAndUpdate(cond, update, opts);

      assert.strictEqual(doc.arr.length, 1);
      assert.strictEqual(doc.arr[0][0], 'one');
      assert.strictEqual(doc.arr[0][1], 'two');
    });

    it('casting embedded discriminators if path specified in filter (gh-5841)', async function() {
      const sectionSchema = new Schema({ show: Boolean, order: Number },
        { discriminatorKey: 'type', _id: false });

      const siteSchema = new Schema({ sections: [sectionSchema] });
      const sectionArray = siteSchema.path('sections');

      const headerSchema = new Schema({ title: String }, { _id: false });
      sectionArray.discriminator('header', headerSchema);

      const textSchema = new Schema({ text: String }, { _id: false });
      sectionArray.discriminator('text', textSchema);

      const Site = db.model('Test', siteSchema);

      let doc = await Site.create({
        sections: [
          { type: 'header', title: 't1' },
          { type: 'text', text: 'abc' }
        ]
      });

      await Site.updateOne({ 'sections.type': 'header' }, {
        $set: { 'sections.$.title': 'Test' }
      });

      doc = await Site.findById(doc._id);
      assert.equal(doc.sections[0].title, 'Test');
    });

    it('update with nested id (gh-5640)', async function() {
      const testSchema = new mongoose.Schema({
        _id: {
          a: String,
          b: String
        },
        foo: String
      }, {
        strict: true
      });

      const Test = db.model('Test', testSchema);

      let doc = {
        _id: {
          a: 'a',
          b: 'b'
        },
        foo: 'bar'
      };

      doc = await Test.create(doc);
      doc.foo = 'baz';
      await Test.updateOne({ _id: doc._id }, doc, { upsert: true });

      doc = await Test.findOne({ _id: doc._id });
      assert.equal(doc.foo, 'baz');


    });

    it('$inc cast errors (gh-6770)', async function() {
      const testSchema = new mongoose.Schema({ num: Number });
      const Test = db.model('Test', testSchema);

      await Test.create({ num: 1 });

      let threw = false;
      try {
        await Test.updateOne({}, { $inc: { num: 'not a number' } });
      } catch (error) {
        threw = true;
        assert.ok(error instanceof CastError);
        assert.equal(error.path, 'num');
      }
      assert.ok(threw);

      threw = false;
      try {
        await Test.updateOne({}, { $inc: { num: null } });
      } catch (error) {
        threw = true;
        assert.ok(error instanceof CastError);
        assert.equal(error.path, 'num');
      }
      assert.ok(threw);
    });

    it('does not treat virtuals as an error for strict: throw (gh-6731)', function() {
      const schema = new Schema({
        _id: String,
        total: Number
      }, { strict: 'throw' });

      schema.virtual('capitalGainsTax').get(function() {
        return this.total * 0.15;
      });

      const Test = db.model('Test', schema);

      // Shouldn't throw an error because `capitalGainsTax` is a virtual
      return Test.updateOne({}, { total: 10000, capitalGainsTax: 1500 });
    });

    it('cast error in update conditions (gh-5477)', async function() {
      const schema = new mongoose.Schema({
        name: String
      }, { strict: true });

      const Model = db.model('Test', schema);
      const q = { notAField: true };
      const u = { $set: { name: 'Test' } };
      const o = { upsert: true };

      let error = await Model.updateOne(q, u, o).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.message.indexOf('notAField') !== -1, error.message);
      assert.ok(error.message.indexOf('upsert') !== -1, error.message);

      error = await Model.updateMany(q, u, o).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.message.indexOf('notAField') !== -1, error.message);
      assert.ok(error.message.indexOf('upsert') !== -1, error.message);
    });

    it('single embedded schema under document array (gh-4519)', async function() {
      const PermissionSchema = new mongoose.Schema({
        read: { type: Boolean, required: true },
        write: Boolean
      });
      const UserSchema = new mongoose.Schema({
        permission: {
          type: PermissionSchema
        }
      });
      const GroupSchema = new mongoose.Schema({
        users: [UserSchema]
      });

      const Group = db.model('Group', GroupSchema);
      const update = {
        users: [{
          permission: {}
        }]
      };
      const opts = {
        runValidators: true
      };

      const error = await Group.updateOne({}, update, opts).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.errors['users.0.permission.read'], Object.keys(error.errors));
    });

    it('casts objects to array when clobbering with $set (gh-6532)', function() {
      const sub = new Schema({
        x: String
      });

      const schema = new Schema({
        name: String,
        arr: [sub]
      });

      const Test = db.model('Test', schema);

      const test = {
        name: 'Xyz',
        arr: [{ x: 'Z' }]
      };

      const cond = { name: 'Xyz' };
      const obj1 = { x: 'Y' };
      const set = { $set: { arr: obj1 } };

      return Test.create(test).
        then(function() {
          return Test.updateOne(cond, set);
        }).
        then(function() {
          return Test.collection.findOne({});
        }).
        then(function(found) {
          assert.ok(Array.isArray(found.arr));
          assert.strictEqual(found.arr[0].x, 'Y');
        });
    });
  });
});

describe('model: updateOne: ', function() {
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

  it('updating a map (gh-7111)', async function() {
    const accountSchema = new Schema({ balance: Number });

    const schema = new Schema({
      accounts: {
        type: Map,
        of: accountSchema
      }
    });

    const Test = db.model('Test', schema);

    const doc = await Test.create({ accounts: { USD: { balance: 345 } } });

    await Test.updateOne({}, { accounts: { USD: { balance: 8 } } });

    const updated = await Test.findOne({ _id: doc._id });
    assert.strictEqual(updated.accounts.get('USD').balance, 8);
  });

  it('updating a map path underneath a single nested subdoc (gh-9298)', async function() {
    const schema = Schema({
      cities: {
        type: Map,
        of: Schema({ population: Number })
      }
    });
    const Test = db.model('Test', Schema({ country: schema }));

    await Test.create({});

    await Test.updateOne({}, { 'country.cities.newyork.population': '10000' });

    const updated = await Test.findOne({}).lean();
    assert.strictEqual(updated.country.cities.newyork.population, 10000);
  });

  it('overwrite an array with empty (gh-7135)', async function() {
    const ElementSchema = Schema({
      a: { type: String, required: true }
    }, { _id: false });
    const ArraySchema = Schema({ anArray: [ElementSchema] });

    const TestModel = db.model('Test', ArraySchema);

    let err = await TestModel.
      updateOne({}, { $set: { anArray: [{}] } }, { runValidators: true }).
      then(() => null, err => err);

    assert.ok(err);
    assert.ok(err.errors['anArray.0.a']);

    err = await TestModel.
      updateOne({}, { $set: { 'anArray.0': {} } }, { runValidators: true }).
      then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['anArray.0.a']);
  });

  it('sets child timestamps even without $set (gh-7261)', async function() {
    const childSchema = new Schema({ name: String }, { timestamps: true });
    const parentSchema = new Schema({ child: childSchema });
    const Parent = db.model('Parent', parentSchema);

    await Parent.create({ child: { name: 'Luke Skywalker' } });

    const now = Date.now();
    await delay(10);

    await Parent.updateOne({}, { child: { name: 'Luke Skywalker' } });

    const doc = await Parent.findOne();

    assert.ok(doc.child.createdAt.valueOf() >= now);
    assert.ok(doc.child.updatedAt.valueOf() >= now);
  });

  it('supports discriminators if key is specified in conditions (gh-7843)', function() {
    const testSchema = new mongoose.Schema({
      title: { type: String, required: true },
      kind: { type: String, required: true }
    }, { discriminatorKey: 'kind' });

    const Test = db.model('Test', testSchema);

    const testSchemaChild = new mongoose.Schema({
      label: String
    });

    Test.discriminator('gh7843_child', testSchemaChild, 'testchild');

    const filter = { label: 'bar', kind: 'testchild' };
    const update = { label: 'updated' };
    return Test.create({ title: 'foo', kind: 'testchild', label: 'bar' }).
      then(() => Test.updateOne(filter, update)).
      then(() => Test.collection.findOne()).
      then(doc => assert.equal(doc.label, 'updated'));
  });

  it('immutable createdAt (gh-7917)', async function() {
    const start = new Date().valueOf();
    const schema = Schema({
      createdAt: {
        type: mongoose.Schema.Types.Date,
        immutable: true
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('Test', schema);

    await Model.updateOne({}, { name: 'foo' }, { upsert: true });

    const doc = await Model.collection.findOne();
    assert.ok(doc.createdAt.valueOf() >= start);
  });

  it('conditional immutable (gh-8001)', async function() {
    const schema = Schema({
      test: {
        type: String,
        immutable: ctx => {
          return ctx.getQuery().name != null;
        }
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('Test', schema);

    await Model.updateOne({}, { test: 'before', name: 'foo' }, { upsert: true });
    let doc = await Model.collection.findOne();
    assert.equal(doc.test, 'before');

    await Model.updateOne({ name: 'foo' }, { test: 'after' }, { upsert: true });
    doc = await Model.collection.findOne();
    assert.equal(doc.test, 'before');

    await Model.updateOne({}, { test: 'after' }, { upsert: true });
    doc = await Model.collection.findOne();
    assert.equal(doc.test, 'after');
  });

  it('allow $pull with non-existent schema field (gh-8166)', async function() {
    const Model = db.model('Test', Schema({
      name: String,
      arr: [{
        status: String,
        values: [{ text: String }]
      }]
    }));

    await Model.collection.insertMany([
      {
        name: 'a',
        arr: [{ values: [{ text: '123' }] }]
      },
      {
        name: 'b',
        arr: [{ values: [{ text: '123', coords: 'test' }] }]
      }
    ]);

    await Model.updateMany({}, {
      $pull: { arr: { 'values.0.coords': { $exists: false } } }
    });

    const docs = await Model.find().sort({ name: 1 });
    assert.equal(docs[0].name, 'a');
    assert.equal(docs[0].arr.length, 0);
    assert.equal(docs[1].name, 'b');
    assert.equal(docs[1].arr.length, 1);
  });

  it('update embedded discriminator path if key in $elemMatch (gh-8063)', async function() {
    const slideSchema = new Schema({
      type: { type: String },
      commonField: String
    }, { discriminatorKey: 'type' });
    const schema = new Schema({ slides: [slideSchema] });

    const slidesSchema = schema.path('slides');
    slidesSchema.discriminator('typeA', new Schema({ a: String }));
    slidesSchema.discriminator('typeB', new Schema({ b: String }));

    const MyModel = db.model('Test', schema);
    const doc = await MyModel.create({
      slides: [{ type: 'typeA', a: 'oldValue1', commonField: 'oldValue2' }]
    });

    const filter = {
      slides: { $elemMatch: { _id: doc.slides[0]._id, type: 'typeA' } }
    };
    const update = {
      'slides.$.a': 'newValue1',
      'slides.$.commonField': 'newValue2'
    };
    await MyModel.updateOne(filter, update);

    const updatedDoc = await MyModel.findOne();
    assert.equal(updatedDoc.slides.length, 1);
    assert.equal(updatedDoc.slides[0].type, 'typeA');
    assert.equal(updatedDoc.slides[0].a, 'newValue1');
    assert.equal(updatedDoc.slides[0].commonField, 'newValue2');
  });

  it('moves $set of immutable properties to $setOnInsert (gh-8467) (gh-9537)', async function() {
    const childSchema = Schema({ name: String });
    const Model = db.model('Test', Schema({
      name: String,
      age: { type: Number, default: 25, immutable: true },
      child: { type: childSchema, immutable: true }
    }));

    const _opts = { upsert: true };

    await Model.deleteMany({});
    await Model.updateOne({}, { name: 'John', age: 20, child: { name: 'test' } }, _opts);

    const doc = await Model.findOne().lean();
    assert.equal(doc.age, 20);
    assert.equal(doc.name, 'John');
    assert.equal(doc.child.name, 'test');

    await Model.updateOne({}, { name: 'new', age: 29, child: { name: 'new' } }, _opts);
    assert.equal(doc.age, 20);
    assert.equal(doc.name, 'John');
    assert.equal(doc.child.name, 'test');
  });

  it('moves $set of immutable properties to $setOnInsert (gh-8951)', async function() {
    const Model = db.model('Test', Schema({
      name: String,
      age: { type: Number, default: 25, immutable: true }
    }));

    await Model.bulkWrite([
      {
        updateOne: {
          filter: { name: 'John' },
          update: { name: 'John', age: 20 },
          upsert: true
        }
      }
    ]);

    const doc = await Model.findOne().lean();
    assert.equal(doc.age, 20);
  });

  it('updates buffers with `runValidators` successfully (gh-8580)', async function() {
    const Test = db.model('Test', Schema({
      data: { type: Buffer, required: true }
    }));

    const opts = { runValidators: true, upsert: true };
    await Test.updateOne({}, { data: Buffer.from('test') }, opts);

    const doc = await Test.findOne();
    assert.ok(doc.data);
    assert.equal(doc.data.toString('utf8'), 'test');
  });

  it('allows overriding child strict mode with top-level strict (gh-8961)', async function() {
    const emptySchema = Schema({}, {
      strict: false,
      _id: false,
      versionKey: false
    });

    const testSchema = Schema({
      test: String,
      nested: emptySchema
    }, { strict: true, versionKey: false });
    const Test = db.model('Test', testSchema);

    const filter = { test: 'foo' };
    let update = { nested: { notInSchema: 'bar' } };

    await Test.deleteMany({});
    await Test.updateOne(filter, update, { upsert: true });
    let doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'bar');

    await Test.deleteMany({});
    await Test.updateOne(filter, update, { upsert: true, strict: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), void 0);

    update = { 'nested.notInSchema': 'baz' };
    await Test.updateOne(filter, update, { upsert: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'baz');

    update = { 'nested.notInSchema': 'foo' };
    await Test.updateOne(filter, update, { upsert: true, strict: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'baz');
  });

  it('handles timestamp properties in nested paths when overwriting parent path (gh-9105)', async function() {
    const SampleSchema = Schema({ nested: { test: String } }, {
      timestamps: {
        createdAt: 'nested.createdAt',
        updatedAt: 'nested.updatedAt'
      }
    });
    const Test = db.model('Test', SampleSchema);

    const doc = await Test.create({ nested: { test: 'foo' } });
    assert.ok(doc.nested.updatedAt);
    assert.ok(doc.nested.createdAt);

    await delay(10);
    await Test.updateOne({ _id: doc._id }, { nested: { test: 'bar' } });
    const fromDb = await Test.findOne({ _id: doc._id });
    assert.ok(fromDb.nested.updatedAt);
    assert.ok(fromDb.nested.updatedAt > doc.nested.updatedAt);
  });

  describe('mongodb 42 features', function() {
    before(async function() {
      const version = await start.mongodVersion();

      if (version[0] < 4 || (version[0] === 4 && version[1] < 2)) {
        this.skip();
      }
    });

    it('update pipeline (gh-8225)', async function() {
      const schema = Schema({ oldProp: String, newProp: String });
      const Model = db.model('Test', schema);

      await Model.create({ oldProp: 'test' });
      await Model.updateOne({}, [
        { $set: { newProp: 'test2' } },
        { $unset: ['oldProp'] }
      ]);
      let doc = await Model.findOne();
      assert.equal(doc.newProp, 'test2');
      assert.strictEqual(doc.oldProp, void 0);

      // Aliased fields
      await Model.updateOne({}, [
        { $addFields: { oldProp: 'test3' } },
        { $project: { newProp: 0 } }
      ]);
      doc = await Model.findOne();
      assert.equal(doc.oldProp, 'test3');
      assert.strictEqual(doc.newProp, void 0);
    });

    it('update pipeline - $unset with string (gh-11106)', async function() {
      const schema = Schema({ oldProp: String, newProp: String });
      const Model = db.model('Test', schema);

      await Model.create({ oldProp: 'test' });
      await Model.updateOne({}, [
        { $set: { newProp: 'test2' } },
        { $unset: 'oldProp' }
      ]);
      const doc = await Model.findOne();
      assert.equal(doc.newProp, 'test2');
      assert.strictEqual(doc.oldProp, void 0);
    });

    it('update pipeline timestamps (gh-8524)', async function() {
      const Cat = db.model('Test', Schema({ name: String }, { timestamps: true }));

      const cat = await Cat.create({ name: 'Entei' });
      const updatedAt = cat.updatedAt;

      await new Promise(resolve => setTimeout(resolve), 50);
      const updated = await Cat.findOneAndUpdate({ _id: cat._id },
        [{ $set: { name: 'Raikou' } }], { new: true });
      assert.ok(updated.updatedAt.getTime() > updatedAt.getTime());
    });
  });

  describe('overwriteDiscriminatorKey', function() {
    it('allows changing discriminator key in update (gh-6087)', async function() {
      const baseSchema = new Schema({}, { discriminatorKey: 'type' });
      const baseModel = db.model('Test', baseSchema);

      const aSchema = Schema({ aThing: Number }, { _id: false, id: false });
      const aModel = baseModel.discriminator('discriminator-A', aSchema, 'A');

      const bSchema = new Schema({ bThing: String }, { _id: false, id: false });
      const bModel = baseModel.discriminator('discriminator-B', bSchema, 'B');

      // Model is created as a type A
      let doc = await baseModel.create({ type: 'A', aThing: 1 });

      await aModel.updateOne(
        { _id: doc._id },
        { type: 'B', bThing: 'two' },
        { runValidators: true, overwriteDiscriminatorKey: true }
      );

      doc = await baseModel.findById(doc);
      assert.equal(doc.type, 'B');
      assert.ok(doc instanceof bModel);
      assert.equal(doc.bThing, 'two');
    });
  });

  it('update validators respect storeSubdocValidationError (gh-9172)', async function() {
    const opts = { storeSubdocValidationError: false };
    const Model = db.model('Test', Schema({
      nested: Schema({
        arr: [{ name: { type: String, required: true } }]
      }, opts)
    }));

    const err = await Model.updateOne({}, { nested: { arr: [{}] } }, { runValidators: true }).catch(err => err);

    assert.ok(err);
    assert.ok(err.errors['nested.arr.0.name']);
    assert.ok(!err.errors['nested']);
  });

  it('handles spread docs (gh-9518)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      children: [{ name: String }]
    });

    const Person = db.model('Person', schema);

    const doc = await Person.create({
      name: 'Anakin',
      children: [{ name: 'Luke' }]
    });

    doc.children[0].name = 'Luke Skywalker';
    const update = { 'children.0': Object.assign({}, doc.children[0]) };

    await Person.updateOne({ _id: doc._id }, update);

    const fromDb = await Person.findById(doc);
    assert.equal(fromDb.children[0].name, 'Luke Skywalker');
  });

  it('works with doubly nested arrays with $pullAll (gh-13190)', async function() {
    const multiArraySchema = new Schema({
      _id: false,
      label: String,
      arr: [Number]
    });

    const baseTestSchema = new Schema({
      baseLabel: String,
      mArr: [[multiArraySchema]]
    });

    const Test = db.model('Test', baseTestSchema);

    const arrB = new Test({
      baseLabel: 'testx',
      mArr: [[{ label: 'testInner', arr: [1, 2, 3, 4] }]]
    });
    await arrB.save();
    const res = await Test.updateOne(
      { baseLabel: 'testx' },
      { $pullAll: { 'mArr.0.0.arr': [1, 2] } }
    );
    assert.equal(res.modifiedCount, 1);

    const { mArr } = await Test.findById(arrB).lean().orFail();
    assert.deepStrictEqual(mArr, [[{ label: 'testInner', arr: [3, 4] }]]);
  });

  describe('converts dot separated paths to nested structure (gh-10200)', () => {
    it('works with new Model(...)', () => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();
      const payment = new Payment(paymentPOJO);
      assertDocumentStructure(payment.toObject());
    });
    it('works with Model.create(...)', async() => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();
      const payment = await Payment.create(paymentPOJO);
      assertDocumentStructure(payment);
    });
    it('works with Model.updateOne(...)', async() => {
      const User = getPaymentModel();
      const userPOJO = getPaymentWithDotSeparatedPaths();

      const emptyUser = await User.create({});
      await User.updateOne({ _id: emptyUser._id }, userPOJO);
      const user = await User.findOne({ _id: emptyUser._id }).lean();

      assertDocumentStructure(user);
    });
    it('works with Model.bulkWrite(...)', async() => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();

      const emptyPayment = await Payment.create({});

      await Payment.bulkWrite([
        { updateOne: { filter: { _id: emptyPayment._id }, update: paymentPOJO } }
      ]);
      const payment = await Payment.findOne({ _id: emptyPayment._id }).lean();

      assertDocumentStructure(payment);
    });


    function getPaymentModel() {
      const paymentSchema = new Schema({
        paymentFor: String,
        externalServiceResponse: {
          id: String,
          resultDetails: {
            clearingInstituteName: String,
            transaction: {
              receipt: String,
              authorizationCode: String,
              acquirer: { settlementDate: String }
            },
            response: { acquirerCode: String, acquirerMessage: String },
            authorizationResponse: { stan: String },
            sourceOfFunds: { provided: { card: { issuer: String } } }
          }
        }
      });

      const Payment = db.model('Payment', paymentSchema);
      return Payment;
    }

    function getPaymentWithDotSeparatedPaths() {
      return {
        paymentFor: 'order',
        externalServiceResponse: {
          id: '1',
          resultDetails: {
            clearingInstituteName: 'Our local bank',
            'authorizationResponse.stan': '123456',
            'transaction.receipt': 'I am a transaction receipt',
            'transaction.authorizationCode': 'ABCDEF',
            'transaction.acquirer.settlementDate': 'February 2021',
            'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
            nonExistentField: 'I should not be present'
          }
        }
      };
    }

    function assertDocumentStructure(payment) {
      assert.equal(payment.paymentFor, 'order');
      assert.equal(payment.externalServiceResponse.id, '1');
      assert.equal(payment.externalServiceResponse.resultDetails.clearingInstituteName, 'Our local bank');
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.authorizationResponse,
        { stan: '123456' }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.transaction,
        {
          receipt: 'I am a transaction receipt',
          authorizationCode: 'ABCDEF',
          acquirer: { settlementDate: 'February 2021' }
        }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.sourceOfFunds,
        { provided: { card: { issuer: 'Big bank corporation' } } }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.nonExistentField,
        undefined
      );
    }
  });
  it('should throw when matchedCount === 0 and using orFail() on the query gh-11620', async function() {
    const schema = new mongoose.Schema({
      name: String
    });

    const Person = db.model('gh-11620', schema);

    const doc = await Person.create({
      name: 'Anakin'
    });

    const res = await Person.updateOne({ _id: doc._id }, { name: 'Darth Vader' }).orFail();
    assert.equal(res.matchedCount, 1);
    await assert.rejects(async() => {
      await Person.updateOne({ name: 'Anakin' }, { name: 'The Chosen One' }).orFail();
    }, { message: 'No document found for query "{ name: \'Anakin\' }" on model "gh-11620"' });
  });
});

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
