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

  it('moves top-level w, j, wtimeout into writeConcern when schema has no writeConcern', function() {
    const options = { w: 1, j: true, wtimeout: 500 };
    applyWriteConcern(new mongoose.Schema({ name: String }), options);
    assert.deepStrictEqual(options, { writeConcern: { w: 1, j: true, wtimeout: 500 } });
  });

  it('top-level options override schema-level writeConcern', function() {
    const options = { w: 1, wtimeout: 500 };
    const schema = new mongoose.Schema({ name: String }, { writeConcern: { w: 'majority', j: true } });
    applyWriteConcern(schema, options);
    assert.deepStrictEqual(options, { writeConcern: { w: 1, j: true, wtimeout: 500 } });
  });

  it('preserves falsy top-level values like w: 0 and j: false', function() {
    const options = { w: 0, j: false };
    const schema = new mongoose.Schema({ name: String }, { writeConcern: { w: 'majority', j: true } });
    applyWriteConcern(schema, options);
    assert.deepStrictEqual(options, { writeConcern: { w: 0, j: false } });
  });

  it('top-level options override `writeConcern` without mutating it', function() {
    const userWriteConcern = { w: 'majority', j: true };
    const options = { writeConcern: userWriteConcern, w: 1 };
    applyWriteConcern(new mongoose.Schema({ name: String }), options);
    assert.deepStrictEqual(options, { writeConcern: { w: 1, j: true } });
    assert.deepStrictEqual(userWriteConcern, { w: 'majority', j: true });
  });

  it('does not set writeConcern if there is nothing to apply', function() {
    const options = { ordered: false };
    applyWriteConcern(new mongoose.Schema({ name: String }), options);
    assert.deepStrictEqual(options, { ordered: false });
  });
});
