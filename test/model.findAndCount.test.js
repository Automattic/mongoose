'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model: findAndCount:', function() {
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

  it('returns find results and the unpaginated count', async function() {
    const Test = db.model('Test', new Schema({ name: String, value: Number }));
    await Test.create([
      { name: 'a', value: 1 },
      { name: 'b', value: 2 },
      { name: 'c', value: 3 }
    ]);

    const result = Test.findAndCount({}, { name: 1, _id: 0 }, { sort: { value: -1 }, skip: 1, limit: 1 });
    assert.ok(result instanceof Promise);
    assert.equal(result instanceof mongoose.Query, false);

    const [docs, total] = await result;
    assert.deepEqual(docs.map(doc => doc.name), ['b']);
    assert.equal(docs[0]._id, undefined);
    assert.equal(total, 3);
  });

  it('supports string and array projections', async function() {
    const Test = db.model('Test', new Schema({ name: String, value: Number }));
    await Test.create([
      { name: 'a', value: 1 },
      { name: 'b', value: 2 }
    ]);

    for (const projection of ['name -_id', ['name', '-_id']]) {
      const [docs, total] = await Test.findAndCount({}, projection);
      assert.deepEqual(docs.map(doc => doc.toObject()), [
        { name: 'a' },
        { name: 'b' }
      ]);
      assert.equal(total, 2);
    }
  });

  it('runs find and countDocuments middleware', async function() {
    const calls = [];
    const schema = new Schema({ name: String });
    schema.pre('find', function() { calls.push('find:pre'); });
    schema.post('find', function() { calls.push('find:post'); });
    schema.pre('countDocuments', function() { calls.push('count:pre'); });
    schema.post('countDocuments', function() { calls.push('count:post'); });
    const Test = db.model('Test', schema);
    await Test.create({ name: 'a' });

    await Test.findAndCount({});
    assert.deepEqual(calls.sort(), ['count:post', 'count:pre', 'find:post', 'find:pre']);
  });

  it('does not apply lean or populate to the count query', async function() {
    const Child = db.model('Child', new Schema({ name: String }));
    const Test = db.model('Test', new Schema({ child: { type: Schema.Types.ObjectId, ref: 'Child' } }));
    const child = await Child.create({ name: 'child' });
    await Test.create({ child });

    const [docs, total] = await Test.findAndCount({}, null, { lean: true, populate: 'child' });
    assert.equal(docs[0] instanceof mongoose.Document, false);
    assert.equal(docs[0].child.name, 'child');
    assert.equal(total, 1);
  });
});
