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
    const SubSchema1 = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String },
      isThisSchema1: { type: Boolean }
    });

    const SubSchema2 = new mongoose.Schema({
      description: { type: String, required: true },
      title: { type: String },
      isThisSchema2: { type: Boolean }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [SubSchema1, SubSchema2]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Test 1: Missing required fields for both schemas should fail
    const doc1 = new TestModel({
      product: {
        title: 'string',
        isThisSchema1: true,
        isThisSchema2: true
      }
    });

    const err1 = await doc1.save().then(() => null, err => err);
    assert.ok(err1, 'Should have validation error');
    assert.ok(err1.errors['product.price'] || err1.errors['product.description']);

    // Test 2: Valid SubSchema1 (with price) should succeed
    const doc2 = new TestModel({
      product: {
        price: 100,
        title: 'Valid Product',
        isThisSchema1: true
      }
    });

    await doc2.save();
    assert.ok(doc2._id);
    assert.strictEqual(doc2.product.price, 100);

    // Test 3: Valid SubSchema2 (with description) should succeed
    const doc3 = new TestModel({
      product: {
        description: 'A description',
        title: 'Valid Product 2',
        isThisSchema2: true
      }
    });

    await doc3.save();
    assert.ok(doc3._id);
    assert.strictEqual(doc3.product.description, 'A description');
  });

  it('should validate required fields in arrays of unions', async function() {
    const SubSchema1 = new mongoose.Schema({
      price: { type: Number, required: true },
      title: { type: String }
    });

    const SubSchema2 = new mongoose.Schema({
      description: { type: String, required: true },
      title: { type: String }
    });

    const TestSchema = new mongoose.Schema({
      products: [{
        type: mongoose.Schema.Types.Union,
        of: [SubSchema1, SubSchema2]
      }]
    });

    const TestModel = db.model('Test', TestSchema);

    // Test with missing required fields
    const doc1 = new TestModel({
      products: [
        { title: 'Missing both price and description' }
      ]
    });

    const err1 = await doc1.save().then(() => null, err => err);
    assert.ok(err1, 'Should have validation error');
    assert.ok(err1.errors['products.0.price'] || err1.errors['products.0.description']);

    // Test with valid data
    const doc2 = new TestModel({
      products: [
        { price: 50, title: 'Product 1' },
        { description: 'Product 2 desc', title: 'Product 2' }
      ]
    });

    await doc2.save();
    assert.ok(doc2._id);
    assert.strictEqual(doc2.products[0].price, 50);
    assert.strictEqual(doc2.products[1].description, 'Product 2 desc');
  });

  it('should validate custom validators in union schemas', async function() {
    const SubSchema1 = new mongoose.Schema({
      price: {
        type: Number,
        required: true,
        validate: {
          validator: function(v) {
            return v > 0;
          },
          message: 'Price must be positive'
        }
      }
    });

    const SubSchema2 = new mongoose.Schema({
      description: {
        type: String,
        required: true,
        minlength: 5
      }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [SubSchema1, SubSchema2]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Test with invalid price
    const doc1 = new TestModel({
      product: {
        price: -10
      }
    });

    const err1 = await doc1.save().then(() => null, err => err);
    assert.ok(err1, 'Should have validation error');
    assert.ok(err1.errors['product'] || err1.errors['product.price']);

    // Test with invalid description length
    const doc2 = new TestModel({
      product: {
        description: 'abc'
      }
    });

    const err2 = await doc2.save().then(() => null, err => err);
    assert.ok(err2, 'Should have validation error');
    assert.ok(err2.errors['product'] || err2.errors['product.description']);

    // Test with valid data
    const doc3 = new TestModel({
      product: {
        price: 100
      }
    });

    await doc3.save();
    assert.ok(doc3._id);
  });

  it('should work with validateSync', function() {
    const SubSchema1 = new mongoose.Schema({
      price: { type: Number, required: true }
    });

    const SubSchema2 = new mongoose.Schema({
      description: { type: String, required: true }
    });

    const TestSchema = new mongoose.Schema({
      product: {
        type: mongoose.Schema.Types.Union,
        of: [SubSchema1, SubSchema2]
      }
    });

    const TestModel = db.model('Test', TestSchema);

    // Test with missing required fields
    const doc1 = new TestModel({
      product: {
        title: 'No price or description'
      }
    });

    const err1 = doc1.validateSync();
    assert.ok(err1, 'Should have validation error');
    assert.ok(err1.errors['product.price'] || err1.errors['product.description']);

    // Test with valid data
    const doc2 = new TestModel({
      product: {
        price: 100
      }
    });

    const err2 = doc2.validateSync();
    assert.ifError(err2);
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
});
