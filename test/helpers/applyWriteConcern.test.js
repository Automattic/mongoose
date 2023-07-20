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
  it('should not overwrite user specified writeConcern options (gh-13592)', async function() {
    const options = { writeConcern: { w: 'majority' } };
    const testSchema = new mongoose.Schema({ name: String }, { writeConcern: { w: 0 } });
    applyWriteConcern(testSchema, options);
    assert.deepStrictEqual({ writeConcern: { w: 'majority' } }, options);
  });
});
