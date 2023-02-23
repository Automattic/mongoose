'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('id virtual getter', function() {
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

  it('should work as expected with an ObjectId', async function() {
    const schema = new Schema({});

    const S = db.model('Test', schema);
    const s = await S.create({});

    // Comparing with virtual getter
    assert.equal(s._id.toString(), s.id);
  });

  it('should be turned off when `id` option is set to false', async function() {
    const schema = new Schema({}, { id: false });

    const S = db.model('Test', schema);
    const s = await S.create({});

    // Comparing with virtual getter
    assert.equal(s.id, undefined);
  });

  it('should be turned off when the schema has a set `id` path', async function() {
    const schema = new Schema({
      id: String
    });

    const S = db.model('Test', schema);
    const s = await S.create({ id: 'test' });

    // Comparing with expected value
    assert.equal(s.id, 'test');
  });
});
