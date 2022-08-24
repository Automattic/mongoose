'use strict';

const start = require('./common');
const util = require('./util');

const bson = require('bson');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('SchemaUUID', function() {
  let Model;
  let TestSchema;
  let db;

  before(async function() {
    TestSchema = new Schema({ x: { type: mongoose.Schema.Types.UUID } });
    db = await start().asPromise();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(async() => {
    await db.deleteModel(/.*/);
    Model = db.model('Test', TestSchema);
  });
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('basic functionality should work', async function() {
    const doc = new Model({ x: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
    assert.ifError(doc.validateSync());
    assert.ok(typeof doc.x === 'string');
    assert.strictEqual(doc.x, '09190f70-3d30-11e5-8814-0f4df9a59c41');
    await doc.save();

    const query = Model.findOne({ x: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
    assert.ok(typeof query._conditions.x === 'string');

    const res = await query;
    assert.ifError(res.validateSync());
    assert.ok(typeof res.x === 'string');
    assert.strictEqual(res.x, '09190f70-3d30-11e5-8814-0f4df9a59c41');

    // check that the data is actually a buffer in the database with the correct subtype
    const col = db.client.db(db.name).collection(Model.collection.name);
    const rawDoc = await col.findOne({ x: new bson.Binary(Buffer.from('09190f703d3011e588140f4df9a59c41', 'hex'), 4) });
    assert.ok(rawDoc);
    assert.ok(rawDoc.x instanceof bson.Binary);
    assert.strictEqual(rawDoc.x.sub_type, 4);
  });

  it('should throw error in case of invalid string', function() {
    const doc = new Model({ x: 'invalid' });
    const res = doc.validateSync();
    assert.ok(res !== null && res !== undefined);
    const errors = res.errors;
    assert.strictEqual(Object.keys(errors).length, 1);
    assert.ok(errors.x instanceof mongoose.Error.CastError);
  });
});
