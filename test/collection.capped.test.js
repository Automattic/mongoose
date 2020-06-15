/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;


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

  it('schemas should have option size', function() {
    const capped = new Schema({ key: String });
    capped.set('capped', { size: 1000 });

    assert.ok(capped.options.capped);
    assert.equal(capped.options.capped.size, 1000);
  });

  it('creation', function() {
    this.timeout(30000);

    return co(function*() {
      yield db.dropCollection('Test').catch(() => {});

      const capped = new Schema({ key: String });
      capped.set('capped', { size: 1000 });
      const Capped = db.model('Test', capped, 'Test');
      yield Capped.init();
      yield cb => setTimeout(cb, 100);

      const isCapped = yield Capped.collection.isCapped();
      assert.ok(isCapped);
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
