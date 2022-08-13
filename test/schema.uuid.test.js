'use strict';

const start = require('./common');
const util = require('./util');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('SchemaUUID', function() {
  let Model;
  let db;

  before(async function() {
    const schema = new Schema({ x: { type: mongoose.Schema.Types.UUID } });
    mongoose.deleteModel(/Test/);
    Model = mongoose.model('Test', schema);
    db = await start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('basic functionality should work', async function() {
    const doc = new Model({ x: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
    assert.ifError(doc.validateSync());
    assert.ok(typeof doc.x === 'string');
    assert.strictEqual(doc.x, '09190f70-3d30-11e5-8814-0f4df9a59c41');
    console.log('1');
    await doc.save();
    console.log('2');

    const query = Model.findOne({ x: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
    assert.ok(query._conditions.x instanceof mongoose.Types.Buffer.Binary);
    console.log('3');

    const res = await query;
    console.log('4');
    assert.ifError(res.validateSync());
    assert.ok(typeof res.x === 'string');
    assert.strictEqual(res.x, '09190f70-3d30-11e5-8814-0f4df9a59c41');
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
