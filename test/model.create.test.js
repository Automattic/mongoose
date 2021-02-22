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

    after(function(done) {
      db.close(done);
    });

    it('accepts an array and returns an array', function(done) {
      B.create([{ title: 'hi' }, { title: 'bye' }], function(err, posts) {
        assert.ifError(err);

        assert.ok(posts instanceof Array);
        assert.equal(posts.length, 2);
        const post1 = posts[0];
        const post2 = posts[1];
        assert.ok(post1.get('_id') instanceof DocumentObjectId);
        assert.equal(post1.title, 'hi');

        assert.ok(post2.get('_id') instanceof DocumentObjectId);
        assert.equal(post2.title, 'bye');

        done();
      });
    });

    it('fires callback when passed 0 docs', function(done) {
      B.create(function(err, a) {
        assert.ifError(err);
        assert.ok(!a);
        done();
      });
    });

    it('fires callback when empty array passed', function(done) {
      B.create([], function(err, a) {
        assert.ifError(err);
        assert.ok(!a);
        done();
      });
    });

    it('supports passing options', function(done) {
      B.create([{}], { validateBeforeSave: false }, function(error, docs) {
        assert.ifError(error);
        assert.ok(Array.isArray(docs));
        assert.equal(docs.length, 1);
        done();
      });
    });

    it('returns a promise', function(done) {
      const p = B.create({ title: 'returns promise' });
      assert.ok(p instanceof mongoose.Promise);
      done();
    });

    it('creates in parallel', function(done) {
      let countPre = 0,
          countPost = 0;

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
      MWPSH.create([
        { preference: 'xx' },
        { preference: 'yy' },
        { preference: '1' },
        { preference: '2' }
      ], function(err, docs) {
        assert.ifError(err);

        assert.ok(docs instanceof Array);
        assert.equal(docs.length, 4);
        const doc1 = docs[0];
        const doc2 = docs[1];
        const doc3 = docs[2];
        const doc4 = docs[3];
        assert.ok(doc1);
        assert.ok(doc2);
        assert.ok(doc3);
        assert.ok(doc4);
        assert.equal(countPre, 4);
        assert.equal(countPost, 4);
        assert.ok(endTime - startTime < 4 * 100); // serial: >= 4 * 100 parallel: < 4 * 100
        done();
      });
    });

    describe('callback is optional', function() {
      it('with one doc', function(done) {
        const p = B.create({ title: 'optional callback' });
        p.then(function(doc) {
          assert.equal(doc.title, 'optional callback');
          done();
        }, done);
      });

      it('with more than one doc', function(done) {
        const p = B.create({ title: 'optional callback 2' }, { title: 'orient expressions' });
        p.then(function(docs) {
          assert.equal(docs.length, 2);
          const doc1 = docs[0];
          const doc2 = docs[1];
          assert.equal(doc1.title, 'optional callback 2');
          assert.equal(doc2.title, 'orient expressions');
          done();
        }, done);
      });

      it('with array of docs', function(done) {
        const p = B.create([{ title: 'optional callback3' }, { title: '3' }]);
        p.then(function(docs) {
          assert.ok(docs instanceof Array);
          assert.equal(docs.length, 2);
          const doc1 = docs[0];
          const doc2 = docs[1];
          assert.equal(doc1.title, 'optional callback3');
          assert.equal(doc2.title, '3');
          done();
        }, done);
      });

      it('and should reject promise on error', function(done) {
        const p = B.create({ title: 'optional callback 4' });
        p.then(function(doc) {
          const p2 = B.create({ _id: doc._id });
          p2.then(function() {
            assert(false);
          }, function(err) {
            assert(err);
            done();
          });
        }, done);
      });

      it('if callback is falsy, will ignore it (gh-5061)', function(done) {
        B.create({ title: 'test' }, null).
          then(function(doc) {
            assert.equal(doc.title, 'test');
            done();
          }).
          catch(done);
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
