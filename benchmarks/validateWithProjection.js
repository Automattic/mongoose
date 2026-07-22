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

function buildModelAndDoc(numPaths, projectedCount) {
  const schemaDef = {};
  for (let i = 0; i < numPaths; i++) {
    schemaDef[`field${i}`] = { type: String, required: true };
  }
  const schema = new mongoose.Schema(schemaDef, { versionKey: false });
  const Model = mongoose.model(`ValidateBench${numPaths}`, schema);

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
  const doc = buildModelAndDoc(numPaths, projectedCount);
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

  console.log(JSON.stringify(results, null, '  '));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
