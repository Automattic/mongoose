'use strict';

/**
 * Test suite for Model.insertOne() input validation.
 * Ensures ObjectParameterError is thrown for non-object doc arguments.
 */

const assert = require('assert');
const start = require('./common');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Model.insertOne() input validation', function() {
  this.timeout(10000);

  let db;
  let TestModel;

  before(async function() {
    db = start();

    const testSchema = new Schema({
      name: { type: String },
      age: { type: Number }
    });

    TestModel = db.model('InsertOneValidationTest', testSchema);
  });

  after(async function() {
    await TestModel.deleteMany({});
    await db.close();
  });

  it('should throw ObjectParameterError when doc is a string', async function() {
    let threw = false;
    try {
      await TestModel.insertOne('hello world');
    } catch (err) {
      threw = true;
      assert.ok(
        err.name === 'ObjectParameterError',
        `Expected ObjectParameterError but got: ${err.name} - ${err.message}`
      );
    }
    assert.ok(threw, 'Expected insertOne() to throw but it did not');
  });

  it('should throw ObjectParameterError when doc is a number', async function() {
    let threw = false;
    try {
      await TestModel.insertOne(42);
    } catch (err) {
      threw = true;
      assert.ok(
        err.name === 'ObjectParameterError',
        `Expected ObjectParameterError but got: ${err.name}`
      );
    }
    assert.ok(threw, 'Expected insertOne() to throw but it did not');
  });

  it('should throw ObjectParameterError when doc is a boolean', async function() {
    let threw = false;
    try {
      await TestModel.insertOne(true);
    } catch (err) {
      threw = true;
      assert.ok(
        err.name === 'ObjectParameterError',
        `Expected ObjectParameterError but got: ${err.name}`
      );
    }
    assert.ok(threw, 'Expected insertOne() to throw but it did not');
  });

  it('should throw ObjectParameterError when doc is null', async function() {
    await assert.rejects(() => TestModel.insertOne(null), /ObjectParameterError/);
  });

  it('should successfully insert a valid document', async function() {
    const result = await TestModel.insertOne({ name: 'Alice', age: 25 });
    assert.ok(result, 'Expected a result document');
    assert.strictEqual(result.name, 'Alice');
    assert.strictEqual(result.age, 25);
    assert.ok(result._id, 'Expected result to have an _id');
  });

  it('should successfully insert an empty object', async function() {
    const result = await TestModel.insertOne({});
    assert.ok(result, 'Expected a result document');
    assert.ok(result._id, 'Expected result to have an _id');
  });

  it('should throw ObjectParameterError when doc is undefined', async function() {
    await assert.rejects(() => TestModel.insertOne(undefined), /ObjectParameterError/);
  });
});
