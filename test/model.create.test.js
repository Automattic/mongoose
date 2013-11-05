/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , DocumentObjectId = mongoose.Types.ObjectId

/**
 * Setup
 */

var schema = Schema({
    title: String
})


describe('model', function(){
  describe('create()', function(){
    var db;
    var B;

    before(function(){
      db = start();
      B = db.model('model-create', schema, 'model-create-'+random());
    })

    after(function(done){
      db.close(done);
    })

    it('accepts an array', function(done){
      B.create([{ title: 'hi'}, { title: 'bye'}], function (err, post1, post2) {
        assert.ifError(err);

        assert.ok(post1.get('_id') instanceof DocumentObjectId);
        assert.equal(post1.title,'hi');

        assert.ok(post2.get('_id') instanceof DocumentObjectId);
        assert.equal(post2.title,'bye');

        done();
      });
    });

    it('fires callback when passed 0 docs', function(done){
      B.create(function (err, a) {
        assert.ifError(err);
        assert.ok(!a);
        done();
      });
    });

    it('fires callback when empty array passed', function(done){
      B.create([], function (err, a) {
        assert.ifError(err);
        assert.ok(!a);
        done();
      });
    });

    it('returns a promise', function(done){
      var p = B.create({ title: 'returns promise' }, function(){
        assert.ok(p instanceof mongoose.Promise);
        done();
      });
    })

    describe('callback is optional', function(){
      it('with one doc', function(done){
        var p = B.create({ title: 'optional callback' });
        p.then(function (doc) {
          assert.equal('optional callback', doc.title);
          done();
        }, done).end();
      })

      it('with more than one doc', function(done){
        var p = B.create({ title: 'optional callback 2' }, { title: 'orient expressions' });
        p.then(function (doc1, doc2) {
          assert.equal('optional callback 2', doc1.title);
          assert.equal('orient expressions', doc2.title);
          done();
        }, done).end();
      })

      it('with array of docs', function(done){
        var p = B.create([{ title: 'optional callback3' }, { title: '3' }]);
        p.then(function (doc1, doc2) {
          assert.equal('optional callback3', doc1.title);
          assert.equal('3', doc2.title);
          done();
        }, done).end();
      })
    })
  });
})
