'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const util = require('./util');

describe('model: findByIdAndUpdate:', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('returns the edited document with previous and target discriminators types defined', async function() {
    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    schema.path('shape').discriminator('gh8378_Circle',
      Schema({ radius: String, color: String }));
    schema.path('shape').discriminator('gh8378_Square',
      Schema({ side: Number, color: String }));

    const MyModel = db.model('Test', schema);


    let doc = await MyModel.create({
      shape: {
        kind: 'gh8378_Circle',
        name: 'before',
        radius: 5,
        color: 'red'
      }
    });

    doc = await MyModel.findByIdAndUpdate(doc._id, {
      'shape.kind': 'gh8378_Square',
      'shape.name': 'after',
      'shape.side': 4,
      'shape.color': 'white'
    }, { new: true });

    assert.equal(doc.shape.kind, 'gh8378_Square');
    assert.equal(doc.shape.name, 'after');
    assert.equal(doc.shape.side, 4);
    assert.equal(doc.shape.color, 'white');
  });

  it('returns the edited document with only previous discriminator type defined', async function() {
    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    schema.path('shape').discriminator('gh8378_Circle',
      Schema({ radius: String, color: String }));
    schema.path('shape').discriminator('gh8378_Square',
      Schema({ side: Number, color: String }));

    const MyModel = db.model('Test', schema);


    let doc = await MyModel.create({
      shape: {
        kind: 'gh8378_Circle',
        name: 'before',
        radius: 5,
        color: 'red'
      }
    });

    doc = await MyModel.findByIdAndUpdate(doc._id, {
      'shape.kind': 'gh8378_Square',
      'shape.name': 'after',
      'shape.side': 4,
      'shape.color': 'white'
    }, { new: true, overwriteDiscriminatorKey: true });

    assert.equal(doc.shape.kind, 'gh8378_Square');
    assert.equal(doc.shape.name, 'after');
    assert.equal(doc.shape.side, 4);
    assert.equal(doc.shape.color, 'white');
  });
});
