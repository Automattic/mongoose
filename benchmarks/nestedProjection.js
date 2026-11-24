'use strict';

// No MongoDB connection is needed: hydrate the same projected result for each
// iteration to include the cost of constructing the projection index.
const mongoose = require('../');
const { performance } = require('perf_hooks');
const path = require('path');

const iterations = Number(process.env.ITERATIONS || 50);
const results = [];
const versions = [{ name: 'current', mongoose }];
// Optionally pass an installed baseline checkout to interleave both versions.
if (process.argv[2]) {
  versions.unshift({ name: 'baseline', mongoose: require(path.resolve(process.argv[2])) });
}

function medianTimes(operations) {
  const samples = operations.map(operation => ({ operation, times: [] }));
  for (let i = 0; i < 20; ++i) {
    for (const sample of samples) {
      sample.operation();
    }
  }
  for (let trial = 0; trial < 5; ++trial) {
    const order = trial % 2 === 0 ? samples : samples.slice().reverse();
    for (const sample of order) {
      const start = performance.now();
      for (let i = 0; i < iterations; ++i) {
        sample.operation();
      }
      sample.times.push((performance.now() - start) / iterations);
    }
  }
  return samples.map(sample => {
    sample.times.sort((a, b) => a - b);
    return Number(sample.times[2].toFixed(4));
  });
}

for (const nested of [false, true]) {
  for (const selectedCount of [10, 100, 500]) {
    const definition = {};
    const projection = {};
    const data = {};
    for (let i = 0; i < selectedCount * 2; ++i) {
      const root = `field${i}`;
      const path = nested ? `${root}.value` : root;
      definition[path] = { type: String, get: value => value?.toUpperCase() };
      if (i < selectedCount) {
        projection[path] = 1;
        data[root] = nested ? { value: 'test' } : 'test';
      }
    }
    const targets = versions.map(version => {
      const Model = version.mongoose.model(
        `Projection${version.name}${nested}${selectedCount}`,
        new version.mongoose.Schema(definition)
      );
      return { Model, doc: Model.hydrate(data, projection) };
    });
    const hydrateTimes = medianTimes(targets.map(({ Model }) => () => Model.hydrate(data, projection).toObject({ getters: true })));
    const serializeTimes = medianTimes(targets.map(({ doc }) => () => doc.toObject({ getters: true })));
    versions.forEach((version, i) => {
      results.push({
        version: version.name,
        projection: nested ? 'nested' : 'flat',
        schemaPaths: selectedCount * 2,
        projectionKeys: selectedCount,
        'hydrate + toObject (ms)': hydrateTimes[i],
        'toObject only (ms)': serializeTimes[i]
      });
    });
  }
}

console.log(JSON.stringify({ node: process.version, iterations, results }, null, 2));
