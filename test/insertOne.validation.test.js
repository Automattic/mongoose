'use strict';

/**
 * Test: insertOne() should throw ObjectParameterError
 * when a non-object is passed as the doc argument.
 *
 * Run this test with:
 *   npm test -- --grep "insertOne"
 */

const assert = require('assert');
const mongoose = require('../');
const Schema = mongoose.Schema;

describe('Model.insertOne() input validation', function() {
  // Increase timeout because connecting to MongoDB takes time
  this.timeout(10000);

  let db;
  let TestModel;

  // Connect to MongoDB before running tests
  before(async function() {
    db = await mongoose.createConnection('mongodb://127.0.0.1:27017/mongoose_insertone_test').asPromise();

    const testSchema = new Schema({
      name: { type: String },
      age: { type: Number }
    });

    TestModel = db.model('InsertOneValidationTest', testSchema);
  });

  // Disconnect and clean up after all tests
  after(async function() {
    await db.dropDatabase();
    await db.close();
  });

  // ✅ TEST 1: passing a string should throw
  it('should throw ObjectParameterError when doc is a string', async function() {
    let threw = false;
    try {
      await TestModel.insertOne('hello world');
    } catch (err) {
      threw = true;
      assert.ok(
        err.name === 'ObjectParameterError',
        `Expected ObjectParameterError but got: ${err.name}`
      );
      assert.ok(
        err.message.includes('doc'),
        `Error message should mention 'doc', got: ${err.message}`
      );
    }
    assert.ok(threw, 'Expected insertOne() to throw but it did not');
  });

  // ✅ TEST 2: passing a number should throw
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

  // ✅ TEST 3: passing a boolean should throw
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

  // ✅ TEST 4: passing null should NOT throw (null is allowed, same as insertMany)
  it('should NOT throw when doc is null', async function() {
    let threw = false;
    try {
      await TestModel.insertOne(null);
    } catch (err) {
      // null creates an empty doc, which is fine
      // only ObjectParameterError is a problem
      if (err.name === 'ObjectParameterError') {
        threw = true;
      }
    }
    assert.ok(!threw, 'insertOne(null) should not throw ObjectParameterError');
  });

  // ✅ TEST 5: passing a valid object should work perfectly
  it('should successfully insert a valid document', async function() {
    const result = await TestModel.insertOne({ name: 'Alice', age: 25 });
    assert.ok(result, 'Expected a result document');
    assert.strictEqual(result.name, 'Alice');
    assert.strictEqual(result.age, 25);
    assert.ok(result._id, 'Expected result to have an _id');
  });

  // ✅ TEST 6: passing an empty object should work
  it('should successfully insert an empty object', async function() {
    const result = await TestModel.insertOne({});
    assert.ok(result, 'Expected a result document');
    assert.ok(result._id, 'Expected result to have an _id');
  });

  // ✅ TEST 7: passing undefined should NOT throw ObjectParameterError
  it('should NOT throw ObjectParameterError when doc is undefined', async function() {
    let threw = false;
    try {
      await TestModel.insertOne(undefined);
    } catch (err) {
      if (err.name === 'ObjectParameterError') {
        threw = true;
      }
    }
    assert.ok(!threw, 'insertOne(undefined) should not throw ObjectParameterError');
  });
});