'use strict';

// Benchmarks `toObject({ getters: true })` on a projected document, where
// only a subset of a wide schema's paths were selected by the originating
// query. Constructs documents directly (no live MongoDB connection needed),
// since the cost being measured is purely in-process (Document#$toObject /
// Document#isSelected), not in query execution.

const mongoose = require('../');

function buildModelAndDoc(numPaths, projectedCount) {
  const schemaDef = {};
  for (let i = 0; i < numPaths; i++) {
    schemaDef[`field${i}`] = String;
  }
  const schema = new mongoose.Schema(schemaDef, { versionKey: false });
  const Model = mongoose.model(`Bench${numPaths}`, schema);

  const obj = {};
  const fields = {};
  for (let i = 0; i < projectedCount; i++) {
    obj[`field${i}`] = `value${i}`;
    fields[`field${i}`] = 1;
  }
  // constructs a document the same way query hydration does for a projected
  // query result (see `Query.prototype._completeMany`)
  return new Model(obj, fields);
}

function bench(numPaths, projectedCount, iterations) {
  const doc = buildModelAndDoc(numPaths, projectedCount);
  // warm up the JIT before measuring
  for (let i = 0; i < 200; i++) {
    doc.toObject({ getters: true });
  }
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    doc.toObject({ getters: true });
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6 / iterations;
}

const ITERATIONS = 1000;
const results = {};
let baseline;
for (const n of [10, 50, 100, 500]) {
  // schema width 2N, with an inclusive projection selecting N of those paths
  const msPerCall = bench(n * 2, n, ITERATIONS);
  if (baseline == null) {
    baseline = msPerCall;
  }
  results[`N=${n}`] = {
    'ms/call': Number(msPerCall.toFixed(5)),
    'ratio to N=10': Number((msPerCall / baseline).toFixed(2))
  };
}

console.log(JSON.stringify(results, null, '  '));
