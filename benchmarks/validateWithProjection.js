'use strict';

// Benchmarks `doc.validate()` on a projected document, where a wide schema
// has many `required: true` paths but only a subset was selected by the
// originating query. This exercises `_getPathsToValidate()`, which calls
// `Document#isSelected()` once per required path in the schema regardless of
// whether that path was actually selected - this is the realistic overhead
// path flagged in review on gh-16385, as opposed to repeatedly calling
// `toObject()` on the same document (see toObjectWithProjectionGetters.js).
// Constructs documents directly (no live MongoDB connection needed), since
// unselected+unmodified required paths are skipped rather than validated.

const mongoose = require('../');

const modelCache = new Map();
function getModel(numPaths, numRequired) {
  const key = `${numPaths}:${numRequired}`;
  let Model = modelCache.get(key);
  if (Model == null) {
    const schemaDef = {};
    for (let i = 0; i < numPaths; i++) {
      schemaDef[`field${i}`] = i < numRequired ? { type: String, required: true } : String;
    }
    const schema = new mongoose.Schema(schemaDef, { versionKey: false });
    Model = mongoose.model(`ValidateBench${numPaths}_${numRequired}`, schema);
    modelCache.set(key, Model);
  }
  return Model;
}

function buildDoc(numPaths, projectedCount, numRequired) {
  const Model = getModel(numPaths, numRequired ?? numPaths);

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

async function bench(numPaths, projectedCount, iterations) {
  const doc = buildDoc(numPaths, projectedCount);
  // warm up the JIT before measuring
  for (let i = 0; i < 200; i++) {
    await doc.validate();
  }
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    await doc.validate();
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6 / iterations;
}

// Same shape of work, but each iteration gets its own document (fresh
// `$__.selectedInfo` cache) and calls `validate()` exactly once - a query
// result validated/re-saved a single time, rather than repeatedly on the
// same instance. `_getPathsToValidate()` calls `isSelected()` once per
// *required* path, not per schema path, so this is the more realistic
// stress case for schemas that are wide but have few required fields.
function benchColdSingleCall(numPaths, numRequired, projectedCount, iterations) {
  return (async () => {
    // warm up the JIT before measuring
    for (let i = 0; i < 500; i++) {
      await buildDoc(numPaths, projectedCount, numRequired).validate();
    }
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      await buildDoc(numPaths, projectedCount, numRequired).validate();
    }
    const end = process.hrtime.bigint();
    return Number(end - start) / 1e6 / iterations;
  })();
}

async function main() {
  const ITERATIONS = 1000;
  const results = {};
  let baseline;
  for (const n of [10, 50, 100, 500]) {
    // schema width 2N required paths, with an inclusive projection selecting
    // N of those paths - the other N are unselected+unmodified and get
    // filtered out via isSelected(), same as toObjectWithProjectionGetters.js
    const msPerCall = await bench(n * 2, n, ITERATIONS);
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
  const COLD_ITERATIONS = 10000;
  // realistic case: wide-ish schema, but only a handful of required fields -
  // a much more common shape than "half the schema is required"
  for (const [numPaths, numRequired] of [[10, 3], [20, 3], [50, 5], [100, 5], [100, 20]]) {
    const projectedCount = Math.max(numRequired, Math.floor(numPaths / 2));
    const msPerCall = await benchColdSingleCall(numPaths, numRequired, projectedCount, COLD_ITERATIONS);
    coldResults[`width=${numPaths},required=${numRequired},projected=${projectedCount}`] =
      `${(msPerCall * 1000).toFixed(3)} us/call`;
  }

  console.log('\nfresh document per call, validate() called once each (no cache reuse):');
  console.log(JSON.stringify(coldResults, null, '  '));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
