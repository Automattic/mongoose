'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup
 */

const schema = new Schema({
  title: { type: String }
});

describe('model', function() {
  describe('create()', function() {
    let db;
    let B;

    before(function() {
      db = start();
      B = db.model('Test', schema);
    });

    after(async function() {
      await db.close();
    });

    it('accepts an array and returns an array', async function() {
      const posts = await B.create([{ title: 'hi' }, { title: 'bye' }]);

      assert.ok(posts instanceof Array);
      assert.equal(posts.length, 2);
      const post1 = posts[0];
      const post2 = posts[1];
      assert.ok(post1.get('_id') instanceof DocumentObjectId);
      assert.equal(post1.title, 'hi');

      assert.ok(post2.get('_id') instanceof DocumentObjectId);
      assert.equal(post2.title, 'bye');
    });

    it('fires callback when passed 0 docs', async function() {
      const docs = await B.create();
      assert.strictEqual(docs, null);
    });

    it('fires callback when empty array passed', async function() {
      const a = await B.create([]);
      assert.deepEqual(a, []);
    });

    it('supports passing options', async function() {
      const docs = await B.create([{}], { validateBeforeSave: false });

      assert.ok(Array.isArray(docs));
      assert.equal(docs.length, 1);
    });

    it('returns a promise', function() {
      const p = B.create({ title: 'returns promise' });
      assert.ok(p instanceof Promise);
    });

    it('creates in parallel', async function() {
      let countPre = 0;
      let countPost = 0;

      const SchemaWithPreSaveHook = new Schema({
        preference: String
      });

      let startTime, endTime;
      SchemaWithPreSaveHook.pre('save', true, function hook(next, done) {
        setTimeout(function() {
          countPre++;
          if (countPre === 1) startTime = Date.now();
          else if (countPre === 4) endTime = Date.now();
          next();
          done();
        }, 100);
      });
      SchemaWithPreSaveHook.post('save', function() {
        countPost++;
      });

      db.deleteModel(/Test/);
      const MWPSH = db.model('Test', SchemaWithPreSaveHook);
      const docs = await MWPSH.create([
        { preference: 'xx' },
        { preference: 'yy' },
        { preference: '1' },
        { preference: '2' }
      ]);

      assert.ok(docs instanceof Array);
      assert.equal(docs.length, 4);

      const [doc1, doc2, doc3, doc4] = docs;

      assert.ok(doc1);
      assert.ok(doc2);
      assert.ok(doc3);
      assert.ok(doc4);
      assert.equal(countPre, 4);
      assert.equal(countPost, 4);
      assert.ok(endTime - startTime < 4 * 100); // serial: >= 4 * 100 parallel: < 4 * 100
    });

    describe('callback is optional', function() {
      it('with one doc', async function() {
        const doc = await B.create({ title: 'optional callback' });

        assert.equal(doc.title, 'optional callback');
      });

      it('with more than one doc', async function() {
        const docs = await B.create({ title: 'optional callback 2' }, { title: 'orient expressions' });

        assert.equal(docs.length, 2);
        const doc1 = docs[0];
        const doc2 = docs[1];
        assert.equal(doc1.title, 'optional callback 2');
        assert.equal(doc2.title, 'orient expressions');
      });

      it('with array of docs', async function() {
        const docs = await B.create([{ title: 'optional callback3' }, { title: '3' }]);

        assert.ok(docs instanceof Array);
        assert.equal(docs.length, 2);
        const doc1 = docs[0];
        const doc2 = docs[1];
        assert.equal(doc1.title, 'optional callback3');
        assert.equal(doc2.title, '3');
      });

      it('and should reject promise on error', async function() {
        const p = B.create({ title: 'optional callback 4' });
        const doc = await p;

        const err = await B.create({ _id: doc._id }).then(() => null, err => err);
        assert(err);
      });

      it('when passed an empty array, returns an empty array', async function() {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const users = await User.create([]);
        assert.deepEqual(users, []);
      });

      it('treats undefined first arg as doc rather than callback (gh-9765)', function() {
        return B.create(void 0).
          then(function(doc) {
            assert.ok(doc);
            assert.ok(doc._id);
          });
      });

      it('ignores undefined last arg (gh-13487)', async function() {
        await B.deleteMany({});
        await B.create({ title: 'foo' }, void 0);
        const docs = await B.find();
        assert.equal(docs.length, 1);
        assert.equal(docs[0].title, 'foo');
      });
    });
    describe('ordered', function() {
      it('runs the document insertion in a series when using the ordered option gh-4038', async function() {
        const countSchema = new Schema({ n: Number });
        const testSchema = new Schema({ name: { type: String, unique: true }, reference: Number });

        const Count = db.model('gh4038', countSchema);

        testSchema.pre('save', async function(next) {
          const doc = await Count.findOneAndUpdate({}, { $inc: { n: 1 } }, { new: true, upsert: true });
          this.reference = doc.n;
          next();
        });

        const Test = db.model('gh4038Test', testSchema);
        const data = [];
        for (let i = 0; i < 11; i++) {
          data.push({ name: 'Test' + Math.abs(i - 4) });
        }
        await Test.create(data, { ordered: true }).catch(err => err);
        const docs = await Test.find();
        assert.equal(docs.length, 5);
      });
      it('should throw an error only after all the documents have finished saving gh-4628', async function() {
        const testSchema = new Schema({ name: { type: String, unique: true } });


        const Test = db.model('gh4628Test', testSchema);
        await Test.init();
        const data = [];
        for (let i = 0; i < 11; i++) {
          data.push({ name: 'Test' + Math.abs(i - 4) });
        }
        await Test.create(data, { ordered: false }).catch(err => err);
        const docs = await Test.find();
        assert.equal(docs.length, 7); // docs 1,2,3,4 should not go through 11-4 == 7
      });

      it('should return the first error immediately if "aggregateErrors" is not explicitly set (ordered)', async function() {
        const testSchema = new Schema({ name: { type: String, required: true } });

        const TestModel = db.model('gh1731-1', testSchema);

        const res = await TestModel.create([{ name: 'test' }, {}, { name: 'another' }], { ordered: true }).then(null).catch(err => err);

        assert.ok(res instanceof mongoose.Error.ValidationError);
      });

      it('should not return errors immediately if "aggregateErrors" is "true" (ordered)', async function() {
        const testSchema = new Schema({ name: { type: String, required: true } });

        const TestModel = db.model('gh1731-2', testSchema);

        const res = await TestModel.create([{ name: 'test' }, {}, { name: 'another' }], { ordered: true, aggregateErrors: true });

        assert.equal(res.length, 3);
        assert.ok(res[0] instanceof mongoose.Document);
        assert.ok(res[1] instanceof mongoose.Error.ValidationError);
        assert.ok(res[2] instanceof mongoose.Document);
      });
    });

    it('should return the first error immediately if "aggregateErrors" is not explicitly set', async function() {
      const testSchema = new Schema({ name: { type: String, required: true } });

      const TestModel = db.model('gh1731-3', testSchema);

      const res = await TestModel.create([{ name: 'test' }, {}, { name: 'another' }], {}).then(null).catch(err => err);

      assert.ok(res instanceof mongoose.Error.ValidationError);
    });

    it('should not return errors immediately if "aggregateErrors" is "true"', async function() {
      const testSchema = new Schema({ name: { type: String, required: true } });

      const TestModel = db.model('gh1731-4', testSchema);

      const res = await TestModel.create([{ name: 'test' }, {}, { name: 'another' }], { aggregateErrors: true });

      assert.equal(res.length, 3);
      assert.ok(res[0] instanceof mongoose.Document);
      assert.ok(res[1] instanceof mongoose.Error.ValidationError);
      assert.ok(res[2] instanceof mongoose.Document);
    });
  });
});
