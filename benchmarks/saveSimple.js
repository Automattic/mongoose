'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');
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

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await FooModel.deleteMany({});
  }

  const numIterations = 500;
  const saveStart = Date.now();
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
  const saveEnd = Date.now();

  const results = {
    'Average save time ms': +((saveEnd - saveStart) / numIterations).toFixed(2)
  };

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}
