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
    prop1: { type: String, required: true, maxlength: 100 },
    prop2: { type: String, required: true, maxlength: 100 },
    prop3: { type: String, required: true, maxlength: 100 },
    prop4: { type: String, required: true, maxlength: 100 },
    prop5: { type: String, required: true, maxlength: 100 },
    prop6: { type: String, required: true, maxlength: 100 },
    prop7: { type: String, required: true, maxlength: 100 },
    prop8: { type: String, required: true, maxlength: 100 },
    prop9: { type: String, required: true, maxlength: 100 },
    prop10: { type: String, required: true, maxlength: 100 }
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

  await fooCollection.insertMany([{ _id: driverId }, { _id: mongooseId }]);

  const numIterations = 500;
  for (let i = 0; i < 15000; ++i) {
    // Warm up
    await fooCollection.findOneAndUpdate(
      { _id: driverId },
      {
        $set: {
          prop1: `driver warmup ${i}`,
          prop2: `driver warmup ${i}`,
          prop3: `driver warmup ${i}`,
          prop4: `driver warmup ${i}`,
          prop5: `driver warmup ${i}`,
          prop6: `driver warmup ${i}`,
          prop7: `driver warmup ${i}`,
          prop8: `driver warmup ${i}`,
          prop9: `driver warmup ${i}`,
          prop10: `driver warmup ${i}`
        }
      }
    );
    await FooModel.findOneAndUpdate(
      { _id: mongooseId },
      {
        $set: {
          prop1: `mongoose warmup ${i}`,
          prop2: `mongoose warmup ${i}`,
          prop3: `mongoose warmup ${i}`,
          prop4: `mongoose warmup ${i}`,
          prop5: `mongoose warmup ${i}`,
          prop6: `mongoose warmup ${i}`,
          prop7: `mongoose warmup ${i}`,
          prop8: `mongoose warmup ${i}`,
          prop9: `mongoose warmup ${i}`,
          prop10: `mongoose warmup ${i}`
        }
      }
    );
    await FooModel.findOneAndUpdate(
      { _id: mongooseId },
      {
        $set: {
          prop1: `validators warmup ${i}`,
          prop2: `validators warmup ${i}`,
          prop3: `validators warmup ${i}`,
          prop4: `validators warmup ${i}`,
          prop5: `validators warmup ${i}`,
          prop6: `validators warmup ${i}`,
          prop7: `validators warmup ${i}`,
          prop8: `validators warmup ${i}`,
          prop9: `validators warmup ${i}`,
          prop10: `validators warmup ${i}`
        }
      },
      { runValidators: true }
    );
  }

  const driverFindOneAndUpdateStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await fooCollection.findOneAndUpdate(
        { _id: driverId },
        {
          $set: {
            prop1: `driver ${i}-${j}`,
            prop2: `driver ${i}-${j}`,
            prop3: `driver ${i}-${j}`,
            prop4: `driver ${i}-${j}`,
            prop5: `driver ${i}-${j}`,
            prop6: `driver ${i}-${j}`,
            prop7: `driver ${i}-${j}`,
            prop8: `driver ${i}-${j}`,
            prop9: `driver ${i}-${j}`,
            prop10: `driver ${i}-${j}`
          }
        }
      );
    }
  }
  const driverFindOneAndUpdateEnd = Date.now();

  const mongooseFindOneAndUpdateStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await FooModel.findOneAndUpdate(
        { _id: mongooseId },
        {
          $set: {
            prop1: `mongoose ${i}-${j}`,
            prop2: `mongoose ${i}-${j}`,
            prop3: `mongoose ${i}-${j}`,
            prop4: `mongoose ${i}-${j}`,
            prop5: `mongoose ${i}-${j}`,
            prop6: `mongoose ${i}-${j}`,
            prop7: `mongoose ${i}-${j}`,
            prop8: `mongoose ${i}-${j}`,
            prop9: `mongoose ${i}-${j}`,
            prop10: `mongoose ${i}-${j}`
          }
        }
      );
    }
  }
  const mongooseFindOneAndUpdateEnd = Date.now();

  const validatorsFindOneAndUpdateStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await FooModel.findOneAndUpdate(
        { _id: mongooseId },
        {
          $set: {
            prop1: `validators ${i}-${j}`,
            prop2: `validators ${i}-${j}`,
            prop3: `validators ${i}-${j}`,
            prop4: `validators ${i}-${j}`,
            prop5: `validators ${i}-${j}`,
            prop6: `validators ${i}-${j}`,
            prop7: `validators ${i}-${j}`,
            prop8: `validators ${i}-${j}`,
            prop9: `validators ${i}-${j}`,
            prop10: `validators ${i}-${j}`
          }
        },
        { runValidators: true }
      );
    }
  }
  const validatorsFindOneAndUpdateEnd = Date.now();

  const results = {
    'Average mongoose findOneAndUpdate time ms': +((mongooseFindOneAndUpdateEnd - mongooseFindOneAndUpdateStart) / numIterations).toFixed(2),
    'Average mongoose findOneAndUpdate with runValidators time ms': +((validatorsFindOneAndUpdateEnd - validatorsFindOneAndUpdateStart) / numIterations).toFixed(2),
    'Average driver findOneAndUpdate time ms': +((driverFindOneAndUpdateEnd - driverFindOneAndUpdateStart) / numIterations).toFixed(2)
  };

  await mongoose.disconnect();
  await client.close();

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}
