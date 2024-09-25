'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');

  const levels = 12;

  let schema = new mongoose.Schema({ test: { type: String, required: true } });
  let doc = { test: 'gh-14897' };
  for (let i = 0; i < levels; ++i) {
    schema = new mongoose.Schema({ level: Number, subdocs: [schema] });
    doc = { level: (levels - i), subdocs: [{ ...doc }, { ...doc }] };
  }
  const Test = mongoose.model('Test', schema);

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await Test.deleteMany({});
  }

  const insertStart = Date.now();
  await Test.create(doc);
  const insertEnd = Date.now();

  const results = {
    'create() time ms': +(insertEnd - insertStart).toFixed(2)
  };

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}