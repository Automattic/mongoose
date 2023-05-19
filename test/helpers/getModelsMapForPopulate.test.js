'use strict';

const assert = require('assert');
const start = require('../common');
const util = require('../util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('getModelsMapForPopulate', function() {
  let db;

  beforeEach(() => db.deleteModel(/.*/));

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('should error on missing options on populate', async function() {
    const sch = new Schema({
      test: mongoose.Schema.Types.ObjectId
    }, {
      virtuals: {
        someVirtual: {}
      }
    });

    const model = db.model('Test', sch);

    const doc = await model.create({ test: new mongoose.Types.ObjectId() });

    await assert.rejects(() => model.findById(doc._id).populate('someVirtual').exec(), /Cannot populate virtual `someVirtual` on model `Test`, because options `localField` and \/ or `foreignField` are missing/);
  });
});
