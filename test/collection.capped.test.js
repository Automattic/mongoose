/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema,
    random = require('../lib/utils').random;

/**
 * setup
 */
var capped = new Schema({key: 'string', val: 'number'});
capped.set('capped', {size: 1000});
var coll = 'capped_' + random();

/**
 * Test.
 */

describe('collections: capped:', function() {
  var db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('schemas should have option size', function(done) {
    assert.ok(capped.options.capped);
    assert.equal(capped.options.capped.size, 1000);
    done();
  });
  it('creation', function(done) {
    var Capped = db.model('Capped', capped, coll);
    Capped.collection.isCapped(function(err, isCapped) {
      assert.ifError(err);
      assert.ok(isCapped, 'should create a capped collection');

      // use the existing capped collection in the db (no coll creation)
      var Capped2 = db.model('Capped2', capped, coll);
      Capped2.collection.isCapped(function(err1, isCapped1) {
        assert.ifError(err1);
        assert.ok(isCapped1, 'should reuse the capped collection in the db');
        assert.equal(Capped.collection.name, Capped2.collection.name);
        done();
      });
    });
  });
  it('creation using a number', function(done) {
    var schema = new Schema({key: 'string'}, {capped: 8192});
    var Capped = db.model('Capped3', schema);
    Capped.collection.options(function(err, options) {
      assert.ifError(err);
      assert.ok(options.capped, 'should create a capped collection');
      assert.equal(options.size, 8192);
      done();
    });
  });
  it('attempting to use existing non-capped collection as capped emits error', function(done) {
    db = start();
    var opts = {};
    var conn = 'capped_existing_' + random();

    db.on('open', function() {
      db.db.createCollection(conn, opts, function(err) {
        if (err) {
          db.close();
        }
        assert.ifError(err);

        var timer;

        db.on('error', function(err1) {
          clearTimeout(timer);
          db.close();
          assert.ok(/non-capped collection exists/.test(err1));
          done();
        });

        db.model('CappedExisting', capped, conn);
        timer = setTimeout(function() {
          db.close();
          throw new Error('capped test timeout');
        }, 900);
      });
    });
  });
});
