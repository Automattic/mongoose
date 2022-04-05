'use strict';

const { exec } = require('child_process');
const mongoose = require('../');

const numIterations = 10;

let instantiations = 0;
let memoryUsed = 0;
let checkTime = 0;
let totalTime = 0;

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  for (let i = 0; i < numIterations; ++i) {
    console.log(`${i}...`);
    const { stdout } = await new Promise((resolve, reject) => {
      exec('../../../node_modules/.bin/tsc --extendedDiagnostics', { cwd: `${__dirname}/typescript/simple` }, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          console.error(stdout);
          console.error(stderr);
          return reject(err);
        }

        resolve({ stdout });
      });
    });

    const lines = stdout.split('\n');

    const _instantiations = +lines.find(line => line.startsWith('Instantiations:')).match(/\d+/)[0];
    const _memoryUsed = +lines.find(line => line.startsWith('Memory used:')).match(/\d+/)[0];
    const _checkTime = +lines.find(line => line.startsWith('Check time:')).match(/\d+(\.\d+)?/)[0];
    const _totalTime = +lines.find(line => line.startsWith('Total time:')).match(/\d+(\.\d+)?/)[0];

    instantiations += _instantiations;
    memoryUsed += _memoryUsed;
    checkTime += _checkTime;
    totalTime += _totalTime;
  }

  instantiations /= numIterations;
  memoryUsed /= numIterations;
  checkTime /= numIterations;
  totalTime /= numIterations;
  console.log(instantiations);
  console.log(memoryUsed);
  console.log(checkTime);
  console.log(totalTime);

  await persist({ instantiations, memoryUsed, checkTime, totalTime });
}

async function persist(results) {
  if (!process.env.DB_URL) {
    return;
  }
  if (!process.env.GITHUB_SHA) {
    return;
  }

  await mongoose.connect(process.env.DB_URL);

  const BenchmarkResult = mongoose.model('BenchmarkResult', mongoose.Schema({
    githash: { type: String, required: true },
    benchmarkName: { type: String, required: true },
    results: 'Mixed'
  }, { timestamps: true }), 'BenchmarkResult');

  await BenchmarkResult.findOneAndUpdate(
    { githash: process.env.GITHUB_SHA, benchmarkName: 'TypeScript' },
    { results },
    { upsert: true }
  );

  await mongoose.disconnect();
}