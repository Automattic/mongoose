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
    const testSchema = new mongoose.Schema({ name: String });
    const Test = db.model('Test', testSchema);
    await Test.create({ name: 'Test Testerson' });
    applyWriteConcern(testSchema, options);
    console.log('=========================')
    await Test.deleteOne();
    console.log('=========================')
    await Test.deleteMany({}, options);
    console.log('what is options after the fact', options);
  });
});