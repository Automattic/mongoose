'use strict';

// Measures the cost of constructing a document whose only path is a large
// `Map` of numbers, which exercises casting a plain object into a MongooseMap.

const mongoose = require('../');

const mapSize = Number(process.env.MONGOOSE_BENCHMARK_MAP_SIZE) || 16000;
const iterations = Number(process.env.MONGOOSE_BENCHMARK_ITERATIONS) || 20;
const samples = Number(process.env.MONGOOSE_BENCHMARK_SAMPLES) || 5;
const warmupIterations = Number(process.env.MONGOOSE_BENCHMARK_WARMUP_ITERATIONS) || 5;

const SimpleMap = mongoose.model('SimpleMap', new mongoose.Schema({
  m: { type: Map, of: Number }
}));

const rawMap = {};
for (let i = 0; i < mapSize; ++i) {
  rawMap['user_' + i] = i;
}

function measure(count) {
  let result = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < count; ++i) {
    // Reading the map size keeps the constructed document observable.
    result += new SimpleMap({ m: rawMap }).m.size;
  }

  if (result !== count * mapSize) {
    throw new Error('Unexpected benchmark result');
  }

  return Number(process.hrtime.bigint() - start) / 1e6;
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

measure(warmupIterations);

const createTime = median(
  Array.from({ length: samples }, () => measure(iterations))
);

console.log(JSON.stringify({
  mapSize,
  iterations,
  samples,
  'create document with map ms/document': +(createTime / iterations).toFixed(6),
  'create document with map ms/key': +(createTime / iterations / mapSize).toFixed(6)
}, null, 2));
