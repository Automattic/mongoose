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
  const FooModel = mongoose.model('FindOneAndUpdateSimpleFoo', FooSchema, 'findOneAndUpdateSimpleFoos');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const fooCollection = db.collection('findOneAndUpdateSimpleFoos');

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await FooModel.deleteMany({});
    await fooCollection.deleteMany({});
  }

  const driverId = new mongoose.Types.ObjectId();
  const mongooseId = new mongoose.Types.ObjectId();

  await fooCollection.replaceOne(
    { _id: driverId },
    { _id: driverId, ...buildProps('driver setup') },
    { upsert: true }
  );
  await fooCollection.replaceOne(
    { _id: mongooseId },
    { _id: mongooseId, ...buildProps('mongoose setup') },
    { upsert: true }
  );

  const numIterations = 500;
  for (let i = 0; i < 15000; ++i) {
    // Warm up
    await fooCollection.findOneAndUpdate(
      { _id: driverId },
      { $set: buildProps(`driver warmup ${i}`) }
    );
    await FooModel.findOneAndUpdate(
      { _id: mongooseId },
      { $set: buildProps(`mongoose warmup ${i}`) }
    );
  }

  const driverFindOneAndUpdateStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await fooCollection.findOneAndUpdate(
        { _id: driverId },
        { $set: buildProps(`driver ${i}-${j}`) }
      );
    }
  }
  const driverFindOneAndUpdateEnd = Date.now();

  const mongooseFindOneAndUpdateStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await FooModel.findOneAndUpdate(
        { _id: mongooseId },
        { $set: buildProps(`mongoose ${i}-${j}`) }
      );
    }
  }
  const mongooseFindOneAndUpdateEnd = Date.now();

  const results = {
    'Average mongoose findOneAndUpdate time ms': +((mongooseFindOneAndUpdateEnd - mongooseFindOneAndUpdateStart) / numIterations).toFixed(2),
    'Average driver findOneAndUpdate time ms': +((driverFindOneAndUpdateEnd - driverFindOneAndUpdateStart) / numIterations).toFixed(2)
  };

  await mongoose.disconnect();
  await client.close();

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}

function buildProps(prefix) {
  return {
    prop1: `${prefix} 1`,
    prop2: `${prefix} 2`,
    prop3: `${prefix} 3`,
    prop4: `${prefix} 4`,
    prop5: `${prefix} 5`,
    prop6: `${prefix} 6`,
    prop7: `${prefix} 7`,
    prop8: `${prefix} 8`,
    prop9: `${prefix} 9`,
    prop10: `${prefix} 10`
  };
}
