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
    });
  });
});
