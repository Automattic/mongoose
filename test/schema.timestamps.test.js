
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , VersionError = mongoose.Error.VersionError
  ;

describe('schema options.timestamps', function() {
  describe('create schema with options.timestamps', function() {
    it('should have createdAt and updatedAt fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created',
          updatedAt: 'updated'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });
  });

  describe('auto update createdAt and updatedAt when create/save/update document', function() {
    var CatSchema = new Schema({
      name: String,
      hobby: String
    }, {timestamps: true});

    var conn = start();
    var Cat = conn.model('Cat', CatSchema);

    before(function(done) {
      Cat.remove({}, done);
    });

    it('should have fields when create', function(done) {
      var cat = new Cat({name: 'newcat'});
      cat.save(function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() == doc.updatedAt.getTime());
        done();
      });
    });

    it('should have fields when create with findOneAndUpdate', function(done) {
      Cat.findOneAndUpdate({name: 'notexistname'}, {$set: {}}, {upsert: true, 'new': true}, function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() == doc.updatedAt.getTime());
        done();
      });
    });

    it('should change updatedAt when save', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should change updatedAt when findOneAndUpdate', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;
        Cat.findOneAndUpdate({name: 'newcat'}, {$set: {hobby: 'fish'}}, {'new': true}, function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should have fields when update', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;
        Cat.update({name: 'newcat'}, {$set: {hobby: 'fish'}}, function() {
          Cat.findOne({name: 'newcat'}, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    after(function(done) {
      Cat.remove({}, done);
    });
  });

});
