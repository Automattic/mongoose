'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;

describe('plugins.sharding', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('applies shard key to deleteOne (gh-15701)', async function() {
    const TestModel = db.model('Test', new mongoose.Schema({ name: String, shardKey: String }));
    const doc = await TestModel.create({ name: 'test', shardKey: 'test1' });
    doc.$__.shardval = { shardKey: 'test2' };
    let res = await doc.deleteOne();
    assert.strictEqual(res.deletedCount, 0);
    doc.$__.shardval = { shardKey: 'test1' };
    res = await doc.deleteOne();
    assert.strictEqual(res.deletedCount, 1);

    await TestModel.create({ name: 'test2', shardKey: 'test2' });
    res = await TestModel.deleteOne({ name: 'test2' });
    assert.strictEqual(res.deletedCount, 1);
  });
});
