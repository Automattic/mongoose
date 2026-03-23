'use strict';

const start = require('./common');
const assert = require('assert');
const generateSchemaFromCollection = require('../lib/helpers/schema/generateSchemaFromCollection');
const mongoose = require('../');

describe('generateSchemaFromCollection', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  it('infers flat schema', async function() {
    const collectionName = 'test_flat';
    const Collection = db.collection(collectionName);
    await Collection.deleteMany({});
    const now = new Date();
    await Collection.insertMany([
      { name: 'val', age: 30, active: true, joined: now },
      { name: 'val2', age: 31, active: false, joined: now }
    ]);

    const schemaDef = await db.generateSchemaFromCollection(collectionName);
    
    assert.deepStrictEqual(schemaDef.name, { type: 'String', required: true });
    assert.deepStrictEqual(schemaDef.age, { type: 'Number', required: true });
    assert.deepStrictEqual(schemaDef.active, { type: 'Boolean', required: true });
    assert.deepStrictEqual(schemaDef.joined, { type: 'Date', required: true });

    // Verify it works with Mongoose Schema
    const schema = new mongoose.Schema(schemaDef);
    assert.strictEqual(schema.path('name').instance, 'String');
    assert.strictEqual(schema.path('age').instance, 'Number');
    assert.strictEqual(schema.path('active').instance, 'Boolean');
    assert.strictEqual(schema.path('joined').instance, 'Date');
  });

  it('infers optional fields', async function() {
    const collectionName = 'test_optional';
    const Collection = db.collection(collectionName);
    await Collection.deleteMany({});
    await Collection.insertMany([
      { name: 'val', age: 30 },
      { name: 'val2' }
    ]);

    const schemaDef = await db.generateSchemaFromCollection(collectionName);
    
    assert.deepStrictEqual(schemaDef.name, { type: 'String', required: true });
    assert.deepStrictEqual(schemaDef.age, { type: 'Number' });
    assert.strictEqual(schemaDef.age.required, undefined);
  });

  it('infers nested objects', async function() {
    const collectionName = 'test_nested';
    const Collection = db.collection(collectionName);
    await Collection.deleteMany({});
    await Collection.insertMany([
      { user: { first: 'John', last: 'Doe' }, metadata: { count: 1 } },
      { user: { first: 'Jane' }, metadata: { count: 2 } }
    ]);

    const schemaDef = await db.generateSchemaFromCollection(collectionName);
    
    assert.ok(schemaDef.user);
    assert.deepStrictEqual(schemaDef.user.first, { type: 'String', required: true });
    assert.deepStrictEqual(schemaDef.user.last, { type: 'String' });
    assert.ok(schemaDef.metadata);
    assert.deepStrictEqual(schemaDef.metadata.count, { type: 'Number', required: true });

    const schema = new mongoose.Schema(schemaDef);
    assert.strictEqual(schema.path('user.first').instance, 'String');
    assert.strictEqual(schema.path('user.last').instance, 'String');
    assert.strictEqual(schema.path('metadata.count').instance, 'Number');
  });

  it('infers arrays', async function() {
    const collectionName = 'test_arrays';
    const Collection = db.collection(collectionName);
    await Collection.deleteMany({});
    await Collection.insertMany([
      { tags: ['a', 'b'], scores: [1, 2], items: [{ id: 1 }, { id: 2 }] },
      { tags: ['c'], scores: [3] }
    ]);

    const schemaDef = await db.generateSchemaFromCollection(collectionName);
    
    assert.deepStrictEqual(schemaDef.tags, ['String']);
    assert.deepStrictEqual(schemaDef.scores, ['Number']);
    assert.deepStrictEqual(schemaDef.items, [{ id: { type: 'Number', required: true } }]);

    const schema = new mongoose.Schema(schemaDef);
    assert.strictEqual(schema.path('tags').instance, 'Array');
    assert.strictEqual(schema.path('tags').embeddedSchemaType.instance, 'String');
    assert.strictEqual(schema.path('scores').embeddedSchemaType.instance, 'Number');
    assert.strictEqual(schema.path('items').instance, 'Array');
    assert.strictEqual(schema.path('items.id').instance, 'Number');
  });

  it('handles Mixed types', async function() {
     const collectionName = 'test_mixed';
     const Collection = db.collection(collectionName);
     await Collection.deleteMany({});
     await Collection.insertMany([
       { mixed: 'string' },
       { mixed: 123 }
     ]);

     const schemaDef = await db.generateSchemaFromCollection(collectionName);
     assert.deepStrictEqual(schemaDef.mixed, { type: 'Mixed', required: true });
  });

  it('handles ObjectId and BSON types', async function() {
    const collectionName = 'test_bson';
    const Collection = db.collection(collectionName);
    await Collection.deleteMany({});
    const oid = new mongoose.Types.ObjectId();
    await Collection.insertMany([
      { _id: oid, ref: oid, dec: new mongoose.Types.Decimal128('1.23') }
    ]);

    const schemaDef = await db.generateSchemaFromCollection(collectionName);
    
    // _id should be ignored in output but others included
    assert.strictEqual(schemaDef._id, undefined);
    assert.deepStrictEqual(schemaDef.ref, { type: 'ObjectId', required: true });
    assert.deepStrictEqual(schemaDef.dec, { type: 'Decimal128', required: true });

    const schema = new mongoose.Schema(schemaDef);
    assert.strictEqual(schema.path('ref').instance.toUpperCase(), 'OBJECTID');
    assert.strictEqual(schema.path('dec').instance, 'Decimal128');
  });
});
