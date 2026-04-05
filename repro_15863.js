'use strict';

const mongoose = require('./lib');
const { Schema } = mongoose;
const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const Child = mongoose.model('Child', new Schema({ name: String }));
  const Parent = mongoose.model('Parent', new Schema({ 
    name: String, 
    children: [{ type: Schema.Types.ObjectId, ref: 'Child' }] 
  }));

  let queryCount = 0;
  mongoose.set('debug', (collectionName, method, query, doc) => {
    if (collectionName === 'children' && method === 'find') {
      queryCount++;
    }
  });

  console.log('\n--- Case 1: Optimization triggers ---');
  const c1 = await Child.create({ name: 'C1' });
  const c2 = await Child.create({ name: 'C2' });
  await Parent.create([
    { name: 'P1', children: [c1._id] },
    { name: 'P2', children: [c2._id] }
  ]);
  queryCount = 0;
  const docs1 = await Parent.find({ name: /^P/ }).populate({
    path: 'children',
    perDocumentLimit: 1
  });
  console.log('Query count:', queryCount);
  assert.strictEqual(queryCount, 1);
  assert.strictEqual(docs1[0].children.length, 1);
  assert.strictEqual(docs1[1].children.length, 1);

  console.log('\n--- Case 2: Fallback ---');
  const c3 = await Child.create({ name: 'C3' });
  const c4 = await Child.create({ name: 'C4' });
  const c5 = await Child.create({ name: 'C5' });
  await Parent.create([
    { name: 'P3', children: [c3._id, c4._id, c5._id] }, // 3 children
    { name: 'P4', children: [c1._id] } // 1 child
  ]);
  // Total docs for this query will be 2 (P3, P4).
  // perDocumentLimit = 1. Total limit = 2.
  // Unique IDs = [c3, c4, c5, c1] = 4.
  // 4 <= 2 is FALSE.
  queryCount = 0;
  const docs2 = await Parent.find({ name: /^P[34]/ }).populate({
    path: 'children',
    perDocumentLimit: 1
  });
  console.log('Query count:', queryCount);
  assert.strictEqual(queryCount, 2);
  assert.strictEqual(docs2[0].children.length, 1);
  assert.strictEqual(docs2[1].children.length, 1);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\nALL TESTS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
