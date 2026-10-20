'use strict';

// Measures the cost of update validators when `findOneAndUpdate()` sets a
// document array whose subdocs contain another document array. Both variants
// send the same update to the same document, so the difference isolates
// `runValidators` rather than casting, query or database time.

const mongoose = require('../');

const iterations = Number(process.env.MONGOOSE_BENCHMARK_ITERATIONS) || 1;
const samples = Number(process.env.MONGOOSE_BENCHMARK_SAMPLES) || 5;
const warmupIterations = Number(process.env.MONGOOSE_BENCHMARK_WARMUP_ITERATIONS) || 1;
const numBranches = 100;
const numCommitsPerBranch = 60;

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');

  const commitSchema = new mongoose.Schema({
    sha: String,
    author: String,
    message: String
  });
  const branchSchema = new mongoose.Schema({
    name: String,
    commits: [commitSchema]
  });
  const Repository = mongoose.model('FindOneAndUpdateDocArrayValidatorsRepository', new mongoose.Schema({
    branches: [branchSchema]
  }));

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await Repository.deleteMany({});
  }

  const { _id } = await Repository.create({ branches: buildBranches('setup') });

  for (let i = 0; i < warmupIterations; ++i) {
    await Repository.findOneAndUpdate({ _id }, { $set: { branches: buildBranches(`warmup ${i}`) } }, { runValidators: false });
    await Repository.findOneAndUpdate({ _id }, { $set: { branches: buildBranches(`warmup ${i}`) } }, { runValidators: true });
  }

  const withoutValidatorsSamples = [];
  for (let i = 0; i < samples; ++i) {
    withoutValidatorsSamples.push(await measure(Repository, _id, false, iterations));
  }
  const withValidatorsSamples = [];
  for (let i = 0; i < samples; ++i) {
    withValidatorsSamples.push(await measure(Repository, _id, true, iterations));
  }
  const withoutValidators = median(withoutValidatorsSamples);
  const withValidators = median(withValidatorsSamples);
  const validatorOverhead = withValidators - withoutValidators;

  console.log(JSON.stringify({
    iterations,
    samples,
    'findOneAndUpdate without runValidators ms/update': +(withoutValidators / iterations).toFixed(2),
    'findOneAndUpdate with runValidators ms/update': +(withValidators / iterations).toFixed(2),
    'update validator overhead ms/update': +(validatorOverhead / iterations).toFixed(2),
    'update validator overhead ratio': +(withValidators / withoutValidators).toFixed(2)
  }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

async function measure(Model, _id, runValidators, count) {
  const start = process.hrtime.bigint();

  for (let i = 0; i < count; ++i) {
    await Model.findOneAndUpdate(
      { _id },
      { $set: { branches: buildBranches(`update ${i}`) } },
      { runValidators }
    );
  }

  return Number(process.hrtime.bigint() - start) / 1e6;
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function buildBranches(prefix) {
  const branches = [];
  for (let i = 0; i < numBranches; ++i) {
    const commits = [];
    for (let j = 0; j < numCommitsPerBranch; ++j) {
      commits.push({
        sha: `${prefix} sha ${i}-${j}`,
        author: `${prefix} author ${i}-${j}`,
        message: `${prefix} message ${i}-${j}`
      });
    }
    branches.push({ name: `${prefix} branch ${i}`, commits });
  }
  return branches;
}
