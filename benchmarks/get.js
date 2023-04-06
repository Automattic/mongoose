'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  const schema = new mongoose.Schema({
    field1: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field2: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field3: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field4: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field5: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field6: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field7: {type: String, default: Math.random().toString(36).slice(2, 16)},
    field8: {type: String, default: Math.random().toString(36).slice(2, 16)},
  }, { versionKey: false });
  const TestModel = mongoose.model('Test', schema);
  
  let tests = [];
  for (let i = 0; i < 10000; i++) {
    tests.push(new TestModel());
  }

  let loopStart = Date.now();

  // run loop with mongoose objects
  for (let k = 0; k < 100; k++) {
    for (let test of tests) {
      test.field1;
      test.field2;
      test.field3;
      test.field4;
      test.field5;
      test.field6;
      test.field7;
      test.field8;
    }
  }

  const results = {
    'Model loop ms': Date.now() - loopStart
  };

  const plainTests = [];
  for (let test of tests) {
    plainTests.push(test.toObject());
  }

  loopStart = Date.now();

  // run loop with plain objects
  for (let k = 0; k < 100; k++) {
    for (let test of plainTests) {
      test.field1;
      test.field2;
      test.field3;
      test.field4;
      test.field5;
      test.field6;
      test.field7;
      test.field8;
    }
  }

  results['POJO loop ms'] = Date.now() - loopStart;

  console.log(JSON.stringify(results, null, '  '));
}