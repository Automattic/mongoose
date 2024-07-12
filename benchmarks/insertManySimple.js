'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');
  const FooSchema = new mongoose.Schema({ foo: String });
  const FooModel = mongoose.model('Foo', FooSchema);

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await FooModel.deleteMany({});
  }

  const numDocs = 1500;
  const docs = [];
  for (let i = 0; i < numDocs; ++i) {
    docs.push({ foo: 'test foo ' + i });
  }

  const numIterations = 200;
  const insertStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    await FooModel.insertMany(docs);
  }
  const insertEnd = Date.now();

  const results = {
    'Average insertMany time ms': +((insertEnd - insertStart) / numIterations).toFixed(2)
  };

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}
