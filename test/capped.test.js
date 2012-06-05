
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , random = require('../lib/utils').random

/**
 * setup
 */

var capped = new Schema({ key: 'string', val: 'number' });
capped.set('capped', { size: 1000 });

var coll = 'capped_' + random();

/**
 * Test.
 */

module.exports = {

  'schema should have option size': function(){
    assert.ok(capped.options.capped);
    assert.equal(1000, capped.options.capped.size);
  },

  'capped collection creation': function () {
    var db = start();
    var Capped = db.model('Capped', capped, coll);
    Capped.collection.isCapped(function (err, isCapped) {
      assert.ifError(err);
      assert.ok(isCapped, 'should create a capped collection');

      // use the existing capped collection in the db (no coll creation)
      var Capped2 = db.model('Capped2', capped, coll);
      Capped2.collection.isCapped(function (err, isCapped) {
        db.close();
        assert.ifError(err);
        assert.ok(isCapped, 'should reuse the capped collection in the db');
        assert.equal(Capped.collection.name, Capped2.collection.name);
      });
    });
  },

  'capped collection creation using a number': function () {
    var db = start();
    var schema = new Schema({ key: 'string' }, { capped: 100 });
    var Capped = db.model('Capped3', schema);
    Capped.collection.options(function (err, options) {
      db.close();
      assert.ifError(err);
      assert.ok(options.capped, 'should create a capped collection');
      assert.equal(100, options.size);
    });
  },

  'attempting to use existing non-capped collection as capped errors': function () {
    var db = start();
    var opts = { safe: true }
    var conn = 'capped_existing_'+random();

    db.on('open', function () {
      db.db.createCollection(conn, opts, function (err) {
        if (err) db.close();
        assert.ifError(err);

        var timer;

        db.on('error', function (err) {
          clearTimeout(timer);
          db.close();
          assert.ok(/non-capped collection exists/.test(err));
        });

        var C = db.model('CappedExisting', capped, conn);
        timer = setTimeout(function () {
          db.close();
          throw new Error('capped test timeout');
        }, 900);
      });
    });
  }

}
