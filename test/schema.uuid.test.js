'use strict';

const start = require('./common');
const util = require('./util');

const assert = require('assert');
const bson = require('bson');
const { randomUUID } = require('crypto');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const { v4: uuidv4 } = require('uuid');

describe('SchemaUUID', function() {
  let Model;
  let TestSchema;
  let db;

  before(async function() {
    TestSchema = new Schema({ x: { type: mongoose.Schema.Types.UUID }, y: [{ type: mongoose.Schema.Types.UUID }] });
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

  it('should work with $in and $nin and $all', async function() {
    const doc1 = new Model({ y: ['f8010af3-bc2c-45e6-85c6-caa30c4a7d34', 'c6f59133-4f84-45a8-bc1d-8f172803e4fe', 'df1309e0-58c5-427a-b22f-6c0fc445ccc0'] });
    const doc2 = new Model({ y: ['13d51406-cd06-4fc2-93d1-4fad9b3eecd7', 'f004416b-e02a-4212-ac77-2d3fcf04898b', '5b544b71-8988-422b-a4df-bf691939fe4e'] });

    await doc1.save();
    await doc2.save();

    // test $in
    const foundDocIn = await Model.find({ y: { $in: ['f8010af3-bc2c-45e6-85c6-caa30c4a7d34'] } });
    assert.ok(foundDocIn);
    assert.strictEqual(foundDocIn.length, 1);
    assert.ok(foundDocIn[0].y);
    assert.strictEqual(foundDocIn[0].y.length, 3);
    assert.strictEqual(foundDocIn[0].y[0], 'f8010af3-bc2c-45e6-85c6-caa30c4a7d34');
    assert.strictEqual(foundDocIn[0].y[1], 'c6f59133-4f84-45a8-bc1d-8f172803e4fe');
    assert.strictEqual(foundDocIn[0].y[2], 'df1309e0-58c5-427a-b22f-6c0fc445ccc0');

    // test $nin
    const foundDocNin = await Model.find({ y: { $nin: ['f8010af3-bc2c-45e6-85c6-caa30c4a7d34'] } });
    assert.ok(foundDocNin);
    assert.strictEqual(foundDocNin.length, 1);
    assert.ok(foundDocNin[0].y);
    assert.strictEqual(foundDocNin[0].y.length, 3);
    assert.strictEqual(foundDocNin[0].y[0], '13d51406-cd06-4fc2-93d1-4fad9b3eecd7');
    assert.strictEqual(foundDocNin[0].y[1], 'f004416b-e02a-4212-ac77-2d3fcf04898b');
    assert.strictEqual(foundDocNin[0].y[2], '5b544b71-8988-422b-a4df-bf691939fe4e');

    // test for $all
    const foundDocAll = await Model.find({ y: { $all: ['13d51406-cd06-4fc2-93d1-4fad9b3eecd7', 'f004416b-e02a-4212-ac77-2d3fcf04898b'] } });
    assert.ok(foundDocAll);
    assert.strictEqual(foundDocAll.length, 1);
    assert.ok(foundDocAll[0].y);
    assert.strictEqual(foundDocAll[0].y.length, 3);
    assert.strictEqual(foundDocAll[0].y[0], '13d51406-cd06-4fc2-93d1-4fad9b3eecd7');
    assert.strictEqual(foundDocAll[0].y[1], 'f004416b-e02a-4212-ac77-2d3fcf04898b');
    assert.strictEqual(foundDocAll[0].y[2], '5b544b71-8988-422b-a4df-bf691939fe4e');
  });

  it('should not convert to string nullish UUIDs (gh-13032)', async function() {
    const schema = new Schema({
      _id: {
        type: Schema.Types.UUID,
        default: uuidv4(),
        immutable: true
      },
      name: {
        type: String,
        required: true
      },
      organization: {
        type: Schema.Types.UUID,
        ref: 'Organization',
        index: true
      }
    }, { _id: false });

    const Test = db.model('gh_13032', schema);

    const { name, organization } = await Test.create({ name: 'test' });

    assert.equal(name, 'test');
    assert.equal(organization, undefined);
  });

  it('works with populate (gh-13267)', async function() {
    const userSchema = new mongoose.Schema({
      _id: { type: 'UUID', default: () => randomUUID() },
      name: String,
      createdBy: {
        type: 'UUID',
        ref: 'User'
      }
    });
    const User = db.model('User', userSchema);

    const u1 = await User.create({ name: 'admin' });
    const { _id } = await User.create({ name: 'created', createdBy: u1._id });

    const pop = await User.findById(_id).populate('createdBy').orFail();
    assert.equal(pop.createdBy.name, 'admin');
    assert.equal(pop.createdBy._id.toString(), u1._id.toString());

    await pop.save();
  });

  it('handles built-in UUID type (gh-13103)', async function() {
    const schema = new Schema({
      _id: {
        type: Schema.Types.UUID
      }
    }, { _id: false });

    db.deleteModel(/Test/);
    const Test = db.model('Test', schema);

    const uuid = new mongoose.Types.UUID();
    let { _id } = await Test.create({ _id: uuid });
    assert.ok(_id);
    assert.equal(typeof _id, 'string');
    assert.equal(_id, uuid.toString());

    ({ _id } = await Test.findById(uuid));
    assert.ok(_id);
    assert.equal(typeof _id, 'string');
    assert.equal(_id, uuid.toString());
  });

  // the following are TODOs based on SchemaUUID.prototype.$conditionalHandlers which are not tested yet
  it('should work with $bits* operators');
  it('should work with $all operator');
  it('should work with $lt, $lte, $gt, $gte operators');
});
