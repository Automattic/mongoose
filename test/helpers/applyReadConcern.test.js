'use strict';

const assert = require('assert');
const applyReadConcern = require('../../lib/helpers/schema/applyReadConcern');
const start = require('../common');
const mongoose = start.mongoose;

describe('applyReadConcern', function() {
  let db;
  before(function() {
    db = start();
  });
  after(async function() {
    await db.close();
  });
  it('should not overwrite user specified read options (gh-14511)', async function() {
    const options = { readConcern: { level: 'majority' } };
    const testSchema = new mongoose.Schema({ name: String }, { readConcern: { level: 'majority ' } });
    applyReadConcern(testSchema, options);
    assert.deepStrictEqual({ readConcern: { level: 'majority' } }, options);
  });
});
