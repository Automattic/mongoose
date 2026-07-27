'use strict';

// Measures the memory overhead of `Document#isSelected()`'s `selectedInfo`
// trie cache across many documents hydrated from the same query - the
// common case of `Model.find({}).select(...)` returning N documents, all of
// which share the exact same projection object reference (see
// `Query.prototype._completeMany` / `lib/queryHelpers.js` `createModel()`,
// which passes the same `fields` object, unmodified, into every document's
// constructor - see gh-16385 review discussion). If each of those documents
// built and cached its own copy of the trie instead of sharing one, that's
// wasted memory proportional to (number of documents) x (trie size).
//
// Requires `--expose-gc` for a clean before/after heap reading:
//   node --expose-gc benchmarks/selectedInfoMemory.js

const mongoose = require('../');
const buildSelectedInfo = require('../lib/helpers/projection/buildSelectedInfo');

function buildModel(numPaths, suffix) {
  const schemaDef = {};
  for (let i = 0; i < numPaths; i++) {
    schemaDef[`field${i}`] = String;
  }
  const schema = new mongoose.Schema(schemaDef, { versionKey: false });
  return mongoose.model(`SelectedInfoMemBench${numPaths}${suffix}`, schema);
}

// `mode: 'shared'` exercises the real code path (`toObject()` ->
// `ensureSelectedInfo()` -> the `WeakMap`-backed cache all documents with
// the same projection reference share). `mode: 'unshared'` forces every
// document to build and hold its own independent trie instead - bypassing
// the shared cache entirely - to give a same-process, apples-to-apples
// baseline for "what if each document didn't share one" without needing a
// separate checkout of the code from before that cache existed.
function measure(mode, numPaths, projectedCount, numDocs) {
  const Model = buildModel(numPaths, mode);

  // one shared projection object, exactly like every document from one
  // query's result set gets in real hydration
  const projection = {};
  for (let i = 0; i < projectedCount; i++) {
    projection[`field${i}`] = 1;
  }

  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;

  const docs = [];
  for (let i = 0; i < numDocs; i++) {
    const doc = new Model({}, projection);
    if (mode === 'shared') {
      // triggers `ensureSelectedInfo()` via `applyGetters()` (numPaths well
      // over the build threshold), which shares one trie via the WeakMap
      doc.toObject({ getters: true });
    } else {
      // build directly, once per document, deliberately not going through
      // the shared cache - simulates a version with no trie-sharing at all
      doc.$__.selectedInfo = buildSelectedInfo(doc.$__.selected);
    }
    docs.push(doc);
  }

  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed;

  const distinctSelectedInfo = new Set(docs.map((d) => d.$__.selectedInfo)).size;

  return {
    heapDeltaMB: Number(((after - before) / 1024 / 1024).toFixed(2)),
    bytesPerDoc: Math.round((after - before) / numDocs),
    distinctSelectedInfoObjects: distinctSelectedInfo
  };
}

if (!global.gc) {
  console.log('(run with `node --expose-gc` for accurate before/after heap readings)\n');
}

const NUM_DOCS = 5000;
const results = {};
for (const numPaths of [50, 200]) {
  const projectedCount = Math.floor(numPaths / 2);
  const label = `numPaths=${numPaths},projected=${projectedCount},docs=${NUM_DOCS}`;
  results[label] = {
    unshared: measure('unshared', numPaths, projectedCount, NUM_DOCS),
    shared: measure('shared', numPaths, projectedCount, NUM_DOCS)
  };
}

console.log(JSON.stringify(results, null, '  '));
