'use strict';

const start = require('./common');
const util = require('./util');

const assert = require('assert');
const bson = require('mongodb/lib/bson');
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
    assert.ok(doc.x instanceof mongoose.Types.UUID);
    assert.strictEqual(doc.x.toString(), '09190f70-3d30-11e5-8814-0f4df9a59c41');
    await doc.save();

    const query = Model.findOne({ x: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
    assert.ok(typeof query._conditions.x === 'string');

    const res = await query;
    assert.ifError(res.validateSync());
    assert.ok(res.x instanceof mongoose.Types.UUID);
    assert.strictEqual(res.x.toString(), '09190f70-3d30-11e5-8814-0f4df9a59c41');

    // check that the data is actually a buffer in the database with the correct subtype
    const col = db.client.db(db.name).collection(Model.collection.name);
    const rawDoc = await col.findOne({ x: new bson.Binary(Buffer.from('09190f703d3011e588140f4df9a59c41', 'hex'), 4) });
    assert.ok(rawDoc);
    assert.ok(rawDoc.x instanceof bson.Binary);
    assert.strictEqual(rawDoc.x.sub_type, 4);

    const rawDoc2 = await col.findOne({ x: new bson.UUID('09190f70-3d30-11e5-8814-0f4df9a59c41') });
    assert.ok(rawDoc2);
    assert.ok(rawDoc2.x instanceof bson.UUID);
    assert.strictEqual(rawDoc2.x.sub_type, 4);
  });

  it('should throw error in case of invalid string', function() {
    const doc = new Model({ x: 'invalid' });
    const res = doc.validateSync();
    assert.ok(res !== null && res !== undefined);
    const errors = res.errors;
    assert.strictEqual(Object.keys(errors).length, 1);
    assert.ok(errors.x instanceof mongoose.Error.CastError);

    assert.ok(errors.x.reason.message.includes('not a valid UUID string'), errors.x.reason.message);
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
    assert.strictEqual(foundDocIn[0].y[0].toString(), 'f8010af3-bc2c-45e6-85c6-caa30c4a7d34');
    assert.strictEqual(foundDocIn[0].y[1].toString(), 'c6f59133-4f84-45a8-bc1d-8f172803e4fe');
    assert.strictEqual(foundDocIn[0].y[2].toString(), 'df1309e0-58c5-427a-b22f-6c0fc445ccc0');

    // test $nin
    const foundDocNin = await Model.find({ y: { $nin: ['f8010af3-bc2c-45e6-85c6-caa30c4a7d34'] } });
    assert.ok(foundDocNin);
    assert.strictEqual(foundDocNin.length, 1);
    assert.ok(foundDocNin[0].y);
    assert.strictEqual(foundDocNin[0].y.length, 3);
    assert.strictEqual(foundDocNin[0].y[0].toString(), '13d51406-cd06-4fc2-93d1-4fad9b3eecd7');
    assert.strictEqual(foundDocNin[0].y[1].toString(), 'f004416b-e02a-4212-ac77-2d3fcf04898b');
    assert.strictEqual(foundDocNin[0].y[2].toString(), '5b544b71-8988-422b-a4df-bf691939fe4e');

    // test for $all
    const foundDocAll = await Model.find({ y: { $all: ['13d51406-cd06-4fc2-93d1-4fad9b3eecd7', 'f004416b-e02a-4212-ac77-2d3fcf04898b'] } });
    assert.ok(foundDocAll);
    assert.strictEqual(foundDocAll.length, 1);
    assert.ok(foundDocAll[0].y);
    assert.strictEqual(foundDocAll[0].y.length, 3);
    assert.strictEqual(foundDocAll[0].y[0].toString(), '13d51406-cd06-4fc2-93d1-4fad9b3eecd7');
    assert.strictEqual(foundDocAll[0].y[1].toString(), 'f004416b-e02a-4212-ac77-2d3fcf04898b');
    assert.strictEqual(foundDocAll[0].y[2].toString(), '5b544b71-8988-422b-a4df-bf691939fe4e');
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

  it('works with lean', async function() {
    const userSchema = new mongoose.Schema({
      _id: { type: 'UUID' },
      name: String
    });
    const User = db.model('User', userSchema);

    const u1 = await User.create({ _id: randomUUID(), name: 'admin' });

    const lean = await User.findById(u1._id).lean().orFail();
    assert.equal(lean.name, 'admin');
    assert.ok(lean._id instanceof mongoose.Types.UUID);
    assert.equal(lean._id.toString(), u1._id.toString());
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
    assert.ok(_id instanceof mongoose.Types.UUID);
    assert.equal(_id, uuid.toString());

    ({ _id } = await Test.findById(uuid));
    assert.ok(_id);
    assert.ok(_id instanceof mongoose.Types.UUID);
    assert.equal(_id, uuid.toString());
  });

  it('avoids converting maps of uuids to strings (gh-13657)', async function() {
    const schema = new mongoose.Schema(
      {
        doc_map: {
          type: mongoose.Schema.Types.Map,
          of: mongoose.Schema.Types.UUID
        }
      }
    );
    db.deleteModel(/Test/);
    const Test = db.model('Test', schema);
    await Test.deleteMany({});

    const user = new Test({
      doc_map: new Map([
        ['role_1', new mongoose.Types.UUID()],
        ['role_2', new mongoose.Types.UUID()]
      ])
    });

    await user.save();

    user.doc_map.set('role_1', new mongoose.Types.UUID());
    await user.save();

    const exists = await Test.findOne({ 'doc_map.role_1': { $type: 'binData' } });
    assert.ok(exists);

    assert.ok(user.get('doc_map.role_1') instanceof mongoose.Types.UUID);
  });

  it('should work with $bits* operators', async function() {
    const schema = new Schema({
      uuid: mongoose.Schema.Types.UUID
    });
    db.deleteModel(/Test/);
    const Test = db.model('Test', schema);

    const uuid = new mongoose.Types.UUID('ff' + '0'.repeat(30));
    await Test.create({ uuid });

    let doc = await Test.findOne({ uuid: { $bitsAllSet: [0, 4] } });
    assert.ok(doc);
    doc = await Test.findOne({ uuid: { $bitsAllSet: 2 ** 15 } });
    assert.ok(!doc);

    doc = await Test.findOne({ uuid: { $bitsAnySet: 3 } });
    assert.ok(doc);
    doc = await Test.findOne({ uuid: { $bitsAnySet: [8] } });
    assert.ok(!doc);

    doc = await Test.findOne({ uuid: { $bitsAnyClear: [0, 32] } });
    assert.ok(doc);
    doc = await Test.findOne({ uuid: { $bitsAnyClear: 7 } });
    assert.ok(!doc);

    doc = await Test.findOne({ uuid: { $bitsAllClear: [16, 17, 18] } });
    assert.ok(doc);
    doc = await Test.findOne({ uuid: { $bitsAllClear: 3 } });
    assert.ok(!doc);
  });

  it('should work with $all operator', async function() {
    const schema = new Schema({
      uuids: [mongoose.Schema.Types.UUID]
    });
    db.deleteModel(/Test/);
    const Test = db.model('Test', schema);

    const uuid1 = new mongoose.Types.UUID();
    const uuid2 = new mongoose.Types.UUID();
    const uuid3 = new mongoose.Types.UUID();
    await Test.create({ uuids: [uuid1, uuid2] });

    let doc = await Test.findOne({ uuids: { $all: [uuid1, uuid2] } });
    assert.ok(doc);

    doc = await Test.findOne({ uuids: { $all: [uuid1, uuid3] } });
    assert.ok(!doc);
  });
});
