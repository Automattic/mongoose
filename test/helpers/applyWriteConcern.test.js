'use strict';

const assert = require('assert');
const applyWriteConcern = require('../../lib/helpers/schema/applyWriteConcern');
const start = require('../common');
const mongoose = start.mongoose;

describe('applyWriteConcern', function() {
  let db;
  before(function() {
    db = start();
  });
  after(async function() {
    await db.close();
  });
  it('should not overwrite user specified writeConcern options gh-13592', async function() {
    const options = { writeConcern: { w: 'majority' } };
    const testSchema = new mongoose.Schema({ name: String }, { writeConcern: { w: 0 } });
    const Test = db.model('Test', testSchema);
    await Test.create({ name: 'Test Testerson' });
    applyWriteConcern(testSchema, options);
    assert.deepStrictEqual({ writeConcern: { w:'majority' } }, options);
    await Test.deleteMany({}, options);
    assert.deepStrictEqual({ writeConcern: { w:'majority' } }, options);
    await Test.deleteMany({});
    /**
     * Because no options were passed in, it is using the schema level writeConcern options.
     * However, because we are ensuring that user specified options are not being overwritten,
     * this is the only reasonable way to test this case as our options object should not match the schema options.
     */
    assert.deepStrictEqual({ writeConcern: { w:'majority' } }, options);
  });
});