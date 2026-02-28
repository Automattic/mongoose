'use strict';

const mongoose = require('../');
const { MongoClient } = require('mongodb');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  const uri = 'mongodb://127.0.0.1:27017/mongoose_benchmark';

  await mongoose.connect(uri);
  const FooSchema = new mongoose.Schema({
    prop1: String,
    prop2: String,
    prop3: String,
    prop4: String,
    prop5: String,
    prop6: String,
    prop7: String,
    prop8: String,
    prop9: String,
    prop10: String
  });
  const FooModel = mongoose.model('Foo', FooSchema);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const fooCollection = db.collection('foos');

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await FooModel.deleteMany({});
    await fooCollection.deleteMany({});
  }

  const numIterations = 500;

  const mongooseSaveStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      const doc = new FooModel({
        prop1: `test ${i}`,
        prop2: `test ${i}`,
        prop3: `test ${i}`,
        prop4: `test ${i}`,
        prop5: `test ${i}`,
        prop6: `test ${i}`,
        prop7: `test ${i}`,
        prop8: `test ${i}`,
        prop9: `test ${i}`,
        prop10: `test ${i}`
      });
      await doc.save();
    }
  }
  const mongooseSaveEnd = Date.now();

  const driverInsertStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await fooCollection.insertOne({
        prop1: `test ${i}`,
        prop2: `test ${i}`,
        prop3: `test ${i}`,
        prop4: `test ${i}`,
        prop5: `test ${i}`,
        prop6: `test ${i}`,
        prop7: `test ${i}`,
        prop8: `test ${i}`,
        prop9: `test ${i}`,
        prop10: `test ${i}`
      });
    }
  }
  const driverInsertEnd = Date.now();

  const results = {
    'Average mongoose save time ms': +((mongooseSaveEnd - mongooseSaveStart) / numIterations).toFixed(2),
    'Average driver insertOne time ms': +((driverInsertEnd - driverInsertStart) / numIterations).toFixed(2)
  };

  await client.close();

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}
