'use strict';

const start = require('./common');
const util = require('./util');

const assert = require('assert');

const mongoose = start.mongoose;

describe('Union validation', function() {
  let db;

  before(async function() {
    db = await start().asPromise();
  });

  after(async function() {
    await db.close();
  });

  afterEach(() => db.deleteModel(/Test/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('should validate required fields in union schemas', async function() {
    // Test primitive | subdocument union
    const SubSchema = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [Number, SubSchema]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Test 1: Number value should succeed
    const doc1 = new TestModel({
      product: 42
    });

    await doc1.save();
    assert.ok(doc1._id);
    assert.strictEqual(doc1.product, 42);

    // Test 2: Valid subdocument (with required price) should succeed
    const doc2 = new TestModel({
      product: {
        price: 100,
        title: 'Valid Product'
      }
    });

    await doc2.save();
    assert.ok(doc2._id);
    assert.strictEqual(doc2.product.price, 100);

    // Test 3: Invalid subdocument (missing required price) should fail
    const doc3 = new TestModel({
      product: {
        title: 'Invalid Product'
      }
    });

    const err3 = await doc3.save().then(() => null, err => err);
    assert.ok(err3, 'Should have validation error');
    assert.ok(err3.errors['product.price']);
  });

  it('should validate required fields in arrays of unions', async function() {
    // Test array of primitive | subdocument unions
    const SubSchema = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      products: [{
        type: mongoose.Schema.Types.Union,
        of: [Number, SubSchema]
      }]
    });

    const TestModel = db.model('TestArray', TestSchema);

    // Test 1: Array with mix of numbers and valid subdocuments should succeed
    const doc1 = new TestModel({
      products: [
        42,
        { price: 100, title: 'Product 1' },
        99
      ]
    });

    await doc1.save();
    assert.ok(doc1._id);
    assert.strictEqual(doc1.products[0], 42);
    assert.strictEqual(doc1.products[1].price, 100);
    assert.strictEqual(doc1.products[2], 99);

    // Test 2: Array with invalid subdocument (missing required price) should fail
    const doc2 = new TestModel({
      products: [
        42,
        { title: 'Invalid Product' }
      ]
    });

    const err2 = await doc2.save().then(() => null, err => err);
    assert.ok(err2, 'Should have validation error');
    assert.ok(err2.errors['products.1.price']);
  });

  it('should validate custom validators in union schemas', async function() {
    // Test primitive | subdocument union with custom validators
    const SubSchema = new mongoose.Schema({
      price: {
        type: Number,
        required: true,
        validate: {
          validator: function(v) {
            return v > 0;
          },
          message: 'Price must be positive'
        }
      },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [String, SubSchema]
      }
    });

    const TestModel = db.model('TestValidator', TestSchema);

    // Test 1: String value should succeed
    const doc1 = new TestModel({
      product: 'simple string'
    });

    await doc1.save();
    assert.ok(doc1._id);
    assert.strictEqual(doc1.product, 'simple string');

    // Test 2: Invalid price (negative) should fail
    const doc2 = new TestModel({
      product: {
        price: -10,
        title: 'Invalid Product'
      }
    });

    const err2 = await doc2.save().then(() => null, err => err);
    assert.ok(err2, 'Should have validation error');
    assert.ok(err2.errors['product.price']);

    // Test 3: Valid subdocument should succeed
    const doc3 = new TestModel({
      product: {
        price: 100,
        title: 'Valid Product'
      }
    });

    await doc3.save();
    assert.ok(doc3._id);
  });

  it('should work with validateSync', function() {
    // Test primitive | subdocument union with validateSync
    const SubSchema = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [Number, SubSchema]
      }
    });

    const TestModel = db.model('TestSync', TestSchema);

    // Test 1: Number value should pass
    const doc1 = new TestModel({
      product: 42
    });

    const err1 = doc1.validateSync();
    assert.ifError(err1);

    // Test 2: Valid subdocument should pass
    const doc2 = new TestModel({
      product: {
        price: 100,
        title: 'Valid'
      }
    });

    const err2 = doc2.validateSync();
    assert.ifError(err2);

    // Test 3: Invalid subdocument (missing required price) should fail
    const doc3 = new TestModel({
      product: {
        title: 'No price'
      }
    });

    const err3 = doc3.validateSync();
    assert.ok(err3, 'Should have validation error');
    assert.ok(err3.errors['product.price']);
  });

  it('should remove arbitrary fields from subdocs on save', async function() {
    const SubSchema1 = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String }
    });

    const SubSchema2 = new mongoose.Schema({
      description: { type: String, required: true },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [SubSchema1, SubSchema2]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Save a valid document that includes an arbitrary field. The arbitrary
    // field should be stripped according to schema strictness when the
    // document is persisted.
    const doc = new TestModel({
      product: {
        price: 20,
        title: 'Product with extra field',
        arbitraryNeverSave: true
      }
    });

    await doc.save();

    const found = await TestModel.findById(doc._id).lean().exec();
    assert.ok(found, 'Saved document should be found');
    // The arbitrary field should not be present on the saved subdocument.
    assert.strictEqual(found.product.arbitraryNeverSave, undefined);
  });

  it('should validate using the same schema type that was used for casting', async function() {
    // This test ensures that casting and validation are tied together.
    // If a value casts as one type, it must validate against that same type's validators.
    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [{ type: Number, required: true, min: 44 }, String]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Test 1: value 12 should cast as Number and fail validation (12 < 44)
    const doc1 = new TestModel({
      product: 12
    });

    const err1 = await doc1.save().then(() => null, err => err);
    assert.ok(err1, 'Should have validation error for number less than min');
    assert.ok(err1.errors['product']);

    // Test 2: value 50 should cast as Number and pass validation (50 > 44)
    const doc2 = new TestModel({
      product: 50
    });

    await doc2.save();
    assert.ok(doc2._id);
    assert.strictEqual(doc2.product, 50);

    // Test 3: string value should cast and validate as String
    const doc3 = new TestModel({
      product: 'hello'
    });

    await doc3.save();
    assert.ok(doc3._id);
    assert.strictEqual(doc3.product, 'hello');
  });
});
