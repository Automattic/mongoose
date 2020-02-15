/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * setup
 */
const capped = new Schema({key: 'string', val: 'number'});
capped.set('capped', {size: 1000});
const coll = 'capped_' + random();

/**
 * Test.
 */

describe('collections: capped:', function() {
  let db;

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
    const Capped = db.model('Capped', capped, coll);
    Capped.collection.isCapped(function(err, isCapped) {
      assert.ifError(err);
      assert.ok(isCapped, 'should create a capped collection');

      // use the existing capped collection in the db (no coll creation)
      const Capped2 = db.model('Capped2', capped, coll);
      Capped2.collection.isCapped(function(err1, isCapped1) {
        assert.ifError(err1);
        assert.ok(isCapped1, 'should reuse the capped collection in the db');
        assert.equal(Capped.collection.name, Capped2.collection.name);
        done();
      });
    });
  });
  it('creation using a number', function(done) {
    const schema = new Schema({key: 'string'}, {capped: 8192});
    const Capped = db.model('Capped3', schema);
    Capped.collection.options(function(err, options) {
      assert.ifError(err);
      assert.ok(options.capped, 'should create a capped collection');
      assert.equal(options.size, 8192);
      done();
    });
  });
  it('attempting to use existing non-capped collection as capped emits error', function(done) {
    db = start();
    const opts = {};
    const conn = 'capped_existing_' + random();

    db.on('open', function() {
      db.db.createCollection(conn, opts, function(err) {
        if (err) {
          db.close();
        }
        assert.ifError(err);

        db.on('error', function(err1) {
          clearTimeout(timer);
          db.close();
          assert.ok(/non-capped collection exists/.test(err1));
          done();
        });

        db.model('CappedExisting', capped, conn);
        const timer = setTimeout(function() {
          db.close();
          throw new Error('capped test timeout');
        }, 900);
      });
    });
  });

  it('skips when setting autoCreate to false (gh-8566)', function() {
    const db = start();
    this.timeout(30000);

    return co(function*() {
      yield db.dropDatabase();

      const schema = new mongoose.Schema({
        name: String
      }, {
        capped: { size: 1024 },
        bufferCommands: false,
        autoCreate: false // disable `autoCreate` since `bufferCommands` is false
      });

      const Model = db.model('Test', schema);
      // Explicitly create the collection before using it
      // so the collection is capped.
      yield Model.createCollection({ capped: true, size: 1024 });

      // Should not throw
      yield Model.create({ name: 'test' });

      yield db.dropDatabase();
    });
  });
});
