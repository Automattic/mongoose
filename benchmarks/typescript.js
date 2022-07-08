'use strict';

const { exec } = require('child_process');
const fs = require('node:fs/promises');
const mongoose = require('../');

const numIterations = 10;
run().catch(err => {
  console.error(err);
  mongoose.disconnect();
  process.exit(-1);
});

async function run() {
  if (process.env.DB_URL) {
    await mongoose.connect(process.env.DB_URL);
  }


  const results = [];

  const tsProjectsDirectories = await fs.readdir('benchmarks/typescript');

  let failed = [];

  for (const tsProjectDirectory of tsProjectsDirectories) {
    let instantiations = 0;
    let memoryUsed = 0;
    let checkTime = 0;
    let totalTime = 0;

    for (let i = 0; i < numIterations; ++i) {
      const { stdout } = await execPromise(
        '../../../node_modules/.bin/tsc --extendedDiagnostics',
        { cwd: `${__dirname}/typescript/${tsProjectDirectory}` }
      );

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

    console.log(`${tsProjectDirectory} instantiations:`, instantiations);
    console.log(`${tsProjectDirectory} memory used:`, memoryUsed);
    console.log(`${tsProjectDirectory} check time:`, checkTime);
    console.log(`${tsProjectDirectory} total time:`, totalTime);
    results.push({
      instantiations,
      memoryUsed,
      checkTime,
      totalTime,
      testName: tsProjectDirectory
    });

    if (instantiations >= 100000) {
      failed.push(tsProjectDirectory);
    }
  }

  await persist({ results });

  await mongoose.disconnect();

  if (failed.length > 0) {
    throw new Error(`Benchmarks ${failed.join(', ')} had over 100k instantiations`);
  }
}

async function persist({ results }) {
  if (!process.env.DB_URL) {
    return;
  }
  if (!process.env.GITHUB_SHA) {
    return;
  }

  const BenchmarkResult = await getBenchmarkResult();
  await BenchmarkResult.updateOne(
    { githash: process.env.GITHUB_SHA, benchmarkName: 'TypeScript' },
    { results },
    { upsert: true }
  );
}

async function getBenchmarkResult() {
  if (mongoose.models.BenchmarkResult) {
    return mongoose.models.BenchmarkResult;
  }

  const benchmarkResultsSchema = mongoose.Schema({
    githash: { type: String, required: true },
    benchmarkName: { type: String, required: true },
    results: 'Mixed'
  }, { timestamps: true });

  benchmarkResultsSchema.index({ githash: 1, benchmarkName: 1 }, { unique: true });


  const BenchmarkResult = mongoose.model('BenchmarkResult', benchmarkResultsSchema, 'BenchmarkResult');

  await BenchmarkResult.syncIndexes();
  return BenchmarkResult;
}

function execPromise(command, options) {
  return new Promise(function(resolve, reject) {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        console.error(stdout);
        console.error(stderr);
        reject(error);
        return;
      }

      resolve({ stdout });
    });
  });
}
