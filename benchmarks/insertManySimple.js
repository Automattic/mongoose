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
  const FooSchema = new mongoose.Schema({ foo: String });
  const FooModel = mongoose.model('Foo', FooSchema, 'foos');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const fooCollection = db.collection('foos');

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await FooModel.deleteMany({});
    await fooCollection.deleteMany({});
  }

  const numDocs = 1500;
  const createDocs = iteration => {
    const docs = [];
    for (let i = 0; i < numDocs; ++i) {
      docs.push({ foo: 'test foo ' + iteration + ' ' + i });
    }
    return docs;
  };

  for (let i = 0; i < 10; ++i) {
    // Warm up
    await FooModel.insertMany(createDocs(i));
  }

  const numIterations = 200;

  for (let i = 0; i < 3; ++i) {
    const driverInsertManyStart = Date.now();
    for (let i = 0; i < numIterations; ++i) {
      await fooCollection.insertMany(createDocs(i));
    }
    const driverInsertManyEnd = Date.now();

    const mongooseInsertManyStart = Date.now();
    for (let i = 0; i < numIterations; ++i) {
      await FooModel.insertMany(createDocs(i), { lean: false });
    }
    const mongooseInsertManyEnd = Date.now();

    const results = {
      'Average mongoose insertMany time ms': +((mongooseInsertManyEnd - mongooseInsertManyStart) / numIterations).toFixed(2),
      'Average driver insertMany time ms': +((driverInsertManyEnd - driverInsertManyStart) / numIterations).toFixed(2)
    };

    console.log(JSON.stringify(results, null, '  '));
  }

  await client.close();
  process.exit(0);
}
