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

  it('stores configured shard keys when hydrating', function() {
    const TestModel = db.model('Test', new mongoose.Schema({ shardKey: String }, { shardKey: { shardKey: 1 } }));
    const doc = TestModel.hydrate({ shardKey: 'test1' });

    assert.deepStrictEqual(doc.$__.shardval, { shardKey: 'test1' });
  });

  it('applies base schema shard key to discriminators with mergeHooks disabled', async function() {
    const BaseModel = db.model('Test', new mongoose.Schema({ name: String, shardKey: String }, { shardKey: { shardKey: 1 } }));
    const Discriminator = BaseModel.discriminator('D', new mongoose.Schema({ extra: String }), { mergeHooks: false });

    const doc = await Discriminator.create({ name: 'test', shardKey: 'test1' });
    assert.deepStrictEqual(doc.$__.shardval, { shardKey: 'test1' });

    const hydrated = Discriminator.hydrate({ _id: doc._id, name: 'test', shardKey: 'test1' });
    assert.deepStrictEqual(hydrated.$__.shardval, { shardKey: 'test1' });

    doc.$__.shardval = { shardKey: 'test2' };
    let res = await doc.updateOne({ $set: { name: 'test2' } });
    assert.strictEqual(res.modifiedCount, 0);
    res = await doc.deleteOne();
    assert.strictEqual(res.deletedCount, 0);

    doc.$__.shardval = { shardKey: 'test1' };
    res = await doc.deleteOne();
    assert.strictEqual(res.deletedCount, 1);
  });

  it('applies shard key to deleteOne (gh-15701)', async function() {
    const TestModel = db.model('Test', new mongoose.Schema({ name: String, shardKey: String }, { shardKey: { shardKey: 1 } }));
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

  it('applies shard key to updateOne (gh-15701)', async function() {
    const TestModel = db.model('Test', new mongoose.Schema({ name: String, shardKey: String }, { shardKey: { shardKey: 1 } }));
    const doc = await TestModel.create({ name: 'test', shardKey: 'test1' });
    doc.$__.shardval = { shardKey: 'test2' };
    let res = await doc.updateOne({ $set: { name: 'test2' } });
    assert.strictEqual(res.modifiedCount, 0);
    doc.$__.shardval = { shardKey: 'test1' };
    res = await doc.updateOne({ $set: { name: 'test2' } });
    assert.strictEqual(res.modifiedCount, 1);
  });
});
