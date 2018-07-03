'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');
const assert = require('power-assert');
const mongoose = start.mongoose;
const random = require('../lib/utils').random;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup
 */

const schema = new Schema({
  title: { type: String, required: true }
});

describe('model', function() {
  describe('create()', function() {
    var db;
    var B;

    before(function() {
      db = start();
      B = db.model('model-create', schema, 'model-create-' + random());
    });

    after(function(done) {
      db.close(done);
    });

    it('accepts an array and returns an array', function(done) {
      B.create([{title: 'hi'}, {title: 'bye'}], function(err, posts) {
        assert.ifError(err);

        assert.ok(posts instanceof Array);
        assert.equal(posts.length, 2);
        var post1 = posts[0];
        var post2 = posts[1];
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
      var p = B.create({title: 'returns promise'});
      assert.ok(p instanceof mongoose.Promise);
      done();
    });

    it('creates in parallel', function(done) {
      // we set the time out to be double that of the validator - 1 (so that running in serial will be greater than that)
      this.timeout(1000);
      var countPre = 0,
          countPost = 0;

      var SchemaWithPreSaveHook = new Schema({
        preference: String
      });
      SchemaWithPreSaveHook.pre('save', true, function hook(next, done) {
        setTimeout(function() {
          countPre++;
          next();
          done();
        }, 500);
      });
      SchemaWithPreSaveHook.post('save', function() {
        countPost++;
      });
      var MWPSH = db.model('mwpsh', SchemaWithPreSaveHook);
      MWPSH.create([
        {preference: 'xx'},
        {preference: 'yy'},
        {preference: '1'},
        {preference: '2'}
      ], function(err, docs) {
        assert.ifError(err);

        assert.ok(docs instanceof Array);
        assert.equal(docs.length, 4);
        var doc1 = docs[0];
        var doc2 = docs[1];
        var doc3 = docs[2];
        var doc4 = docs[3];
        assert.ok(doc1);
        assert.ok(doc2);
        assert.ok(doc3);
        assert.ok(doc4);
        assert.equal(countPre, 4);
        assert.equal(countPost, 4);
        done();
      });
    });

    describe('callback is optional', function() {
      it('with one doc', function(done) {
        var p = B.create({title: 'optional callback'});
        p.then(function(doc) {
          assert.equal(doc.title, 'optional callback');
          done();
        }, done);
      });

      it('with more than one doc', function(done) {
        var p = B.create({title: 'optional callback 2'}, {title: 'orient expressions'});
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
        var p = B.create([{title: 'optional callback3'}, {title: '3'}]);
        p.then(function(docs) {
          assert.ok(docs instanceof Array);
          assert.equal(docs.length, 2);
          var doc1 = docs[0];
          var doc2 = docs[1];
          assert.equal(doc1.title, 'optional callback3');
          assert.equal(doc2.title, '3');
          done();
        }, done);
      });

      it('and should reject promise on error', function(done) {
        var p = B.create({title: 'optional callback 4'});
        p.then(function(doc) {
          var p2 = B.create({_id: doc._id});
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
    });
  });
});
