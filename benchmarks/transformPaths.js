'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  const numPaths = 500;
  const def = {};
  for (let i = 0; i < numPaths; ++i) {
    def['field' + i] = String;
  }
  const schema = new mongoose.Schema(def);
  const TestModel = mongoose.model('Test', schema);

  const payload = {};
  for (let i = 0; i < 5; ++i) {
    payload['field' + i] = 'test value ' + i;
  }
  const doc = new TestModel(payload);

  const numCalls = 20000;

  function loop() {
    const start = process.hrtime.bigint();
    for (let i = 0; i < numCalls; ++i) {
      doc.toObject();
    }
    return Number(process.hrtime.bigint() - start) / 1e6;
  }

  // warm up
  loop();
  loop();

  let best = Infinity;
  for (let i = 0; i < 5; ++i) {
    best = Math.min(best, loop());
  }

  const results = {
    'numPaths': numPaths,
    'numCalls': numCalls,
    'best toObject() loop ms': +best.toFixed(1)
  };

  console.log(JSON.stringify(results, null, '  '));
}
