'use strict';

const mongoose = require('../lib');
const { Schema } = mongoose;
const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('perf(populate): optimize perDocumentLimit', function() {
  let Child;
  let Parent;
  let mongod;

  before(async function() {
    this.timeout(10000);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    
    Child = mongoose.model('Child', new Schema({ name: String }));
    Parent = mongoose.model('Parent', new Schema({ 
      name: String, 
      children: [{ type: Schema.Types.ObjectId, ref: 'Child' }] 
    }));
  });

  after(async function() {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('optimizes perDocumentLimit to a single query when ID count is small (gh-15863)', async function() {
    const c1 = await Child.create({ name: 'C1' });
    const c2 = await Child.create({ name: 'C2' });
    await Parent.create([
      { name: 'P1', children: [c1._id] },
      { name: 'P2', children: [c2._id] }
    ]);

    let queryCount = 0;
    mongoose.set('debug', (collectionName, method) => {
      if (collectionName === 'children' && method === 'find') {
        queryCount++;
      }
    });

    const docs = await Parent.find({ name: /^P[12]/ }).populate({
      path: 'children',
      perDocumentLimit: 1
    });

    assert.strictEqual(queryCount, 1, 'Should have used only 1 query');
    assert.strictEqual(docs[0].children.length, 1);
    assert.strictEqual(docs[1].children.length, 1);
    
    mongoose.set('debug', false);
  });

  it('falls back to multiple queries when ID count > numDocs * perDocumentLimit (gh-15863)', async function() {
    const c3 = await Child.create({ name: 'C3' });
    const c4 = await Child.create({ name: 'C4' });
    const c5 = await Child.create({ name: 'C5' });
    const c6 = await Child.create({ name: 'C6' });

    await Parent.create([
      { name: 'P3', children: [c3._id, c4._id, c5._id] },
      { name: 'P4', children: [c6._id] }
    ]);

    let queryCount = 0;
    mongoose.set('debug', (collectionName, method) => {
      if (collectionName === 'children' && method === 'find') {
        queryCount++;
      }
    });

    const docs = await Parent.find({ name: /^P[34]/ }).populate({
      path: 'children',
      perDocumentLimit: 1
    });

    assert.strictEqual(queryCount, 2, 'Should have used 2 queries (one per parent)');
    assert.strictEqual(docs[0].children.length, 1);
    assert.strictEqual(docs[1].children.length, 1);

    mongoose.set('debug', false);
  });
});
