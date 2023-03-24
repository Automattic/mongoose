/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;


/**
 * Test.
 */

describe('collections: capped:', function() {
  let db;

  afterEach(async function() {
    if (db == null) {
      return;
    }
    await db.close();
    db = null;
  });

  it('schemas should have option size', function() {
    const capped = new Schema({ key: String });
    capped.set('capped', { size: 1000 });

    assert.ok(capped.options.capped);
    assert.equal(capped.options.capped.size, 1000);
  });

  it('creation', async function() {
    this.timeout(15000);

    db = start();

    await db.dropCollection('Test').catch(() => {});

    const capped = new Schema({ key: String });
    capped.set('capped', { size: 1000 });
    const Capped = db.model('Test', capped, 'Test');
    await Capped.init();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const isCapped = await Capped.collection.isCapped();
    assert.ok(isCapped);
  });

  it('skips when setting autoCreate to false (gh-8566)', async function() {
    db = start();
    this.timeout(30000);
    await db.dropDatabase();

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
    await Model.createCollection({ capped: true, size: 1024 });

    // Should not throw
    await Model.create({ name: 'test' });

    await db.dropDatabase();
  });
});
