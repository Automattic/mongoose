'use strict';

// Benchmarks `toObject({ getters: true })` on a projected document, where
// only a subset of a wide schema's paths were selected by the originating
// query. Constructs documents directly (no live MongoDB connection needed),
// since the cost being measured is purely in-process (Document#$toObject /
// Document#isSelected), not in query execution.

const mongoose = require('../');

const modelCache = new Map();
function getModel(numPaths) {
  let Model = modelCache.get(numPaths);
  if (Model == null) {
    const schemaDef = {};
    for (let i = 0; i < numPaths; i++) {
      schemaDef[`field${i}`] = String;
    }
    const schema = new mongoose.Schema(schemaDef, { versionKey: false });
    Model = mongoose.model(`Bench${numPaths}`, schema);
    modelCache.set(numPaths, Model);
  }
  return Model;
}

function buildDoc(numPaths, projectedCount) {
  const Model = getModel(numPaths);

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
  const doc = buildDoc(numPaths, projectedCount);
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

// Same shape of work, but each iteration gets its own document (and thus its
// own fresh `$__.selectedInfo` cache) and calls `toObject()` exactly once -
// the common request/response pattern of hydrating one query result and
// serializing it a single time, as opposed to `bench()` above which reuses
// one document (and its cache) across many calls. This is where a per-call
// cache-build cost, if any, cannot be amortized within the same document.
function benchColdSingleCall(numPaths, projectedCount, iterations) {
  // warm up the JIT before measuring
  for (let i = 0; i < 500; i++) {
    buildDoc(numPaths, projectedCount).toObject({ getters: true });
  }
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    buildDoc(numPaths, projectedCount).toObject({ getters: true });
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

console.log('reused document (cache amortized across calls):');
console.log(JSON.stringify(results, null, '  '));

const coldResults = {};
const COLD_ITERATIONS = 20000;
for (const n of [5, 10, 20, 50, 100]) {
  const projectedCount = Math.max(1, Math.floor(n / 2));
  coldResults[`schemaWidth=${n},projected=${projectedCount}`] =
    `${(benchColdSingleCall(n, projectedCount, COLD_ITERATIONS) * 1000).toFixed(3)} us/call`;
}

console.log('\nfresh document per call, toObject() called once each (no cache reuse):');
console.log(JSON.stringify(coldResults, null, '  '));
