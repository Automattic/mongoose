'use strict';

// Measures the cost of applying defaults underneath nested paths, which happens
// every time a nested path is set to an object, including in `new Model()`.
// The schema has several nested paths, each with paths that have defaults, so
// each nested set has to find the defaults underneath that nested path.

const mongoose = require('../');

const iterations = Number(process.env.MONGOOSE_BENCHMARK_ITERATIONS) || 20000;
const samples = Number(process.env.MONGOOSE_BENCHMARK_SAMPLES) || 7;
const warmupIterations = Number(process.env.MONGOOSE_BENCHMARK_WARMUP_ITERATIONS) || 2000;

const numNested = 8;
const definition = {};
const rawDoc = {};
for (let i = 0; i < numNested; ++i) {
  definition['nested' + i] = {
    name: { type: String, default: 'test' },
    count: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    inner: {
      createdAt: { type: Date, default: () => new Date('2025-06-01') },
      tags: { type: [String], default: () => ['a'] },
      label: String
    },
    notes: String
  };
  definition['top' + i] = { type: String, default: 'top' };
  rawDoc['nested' + i] = { notes: 'notes ' + i };
}

const NestedDefaults = mongoose.model('NestedDefaults', new mongoose.Schema(definition));

function measureConstruct(count) {
  let result = 0;
  const start = process.hrtime.bigint();
  for (let i = 0; i < count; ++i) {
    result += new NestedDefaults(rawDoc).nested0.count;
  }
  if (result !== 0) {
    throw new Error('Unexpected benchmark result');
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

const docForSet = new NestedDefaults({});
function measureSet(count) {
  let result = 0;
  const start = process.hrtime.bigint();
  for (let i = 0; i < count; ++i) {
    docForSet.set({ nested3: { notes: 'x' } });
    result += docForSet.nested3.count;
  }
  if (result !== 0) {
    throw new Error('Unexpected benchmark result');
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

measureConstruct(warmupIterations);
measureSet(warmupIterations);

const construct = median(Array.from({ length: samples }, () => measureConstruct(iterations)));
const set = median(Array.from({ length: samples }, () => measureSet(iterations)));

console.log(JSON.stringify({
  iterations,
  samples,
  'new Model() with nested paths µs/document': +(construct * 1000 / iterations).toFixed(3),
  'doc.set({ nestedPath: obj }) µs/call': +(set * 1000 / iterations).toFixed(3)
}, null, 2));
