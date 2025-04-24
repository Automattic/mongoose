'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');

  const SchemaParticipant = new mongoose.Schema(
    {
      user: mongoose.Schema.Types.UUID,
    },
    {
      _id: false
    }
  );

  const TestSchema = new mongoose.Schema(
    {
      participants1: { type: [SchemaParticipant] },
      participants2: { type: [SchemaParticipant] },
      participants3: { type: [SchemaParticipant] },
      participants4: { type: [SchemaParticipant] },
      participants5: { type: [SchemaParticipant] },
      date: { type: Number },
    },
    {
      collection: 'test_uuid_mutations',
    }
  );

  const TestModel = mongoose.model('Test', TestSchema);

  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await TestModel.deleteMany({});
  }

  const peer = {
    user: '1583b99d-8462-4343-8dfd-9105252e5662',
  };

  const numIterations = 500;
  const queryStart = Date.now();
  for (let i = 0; i < numIterations; ++i) {
    for (let j = 0; j < 10; ++j) {
      await TestModel.findOne({
        $or: [
          { participants1: { $elemMatch: peer } },
          { participants2: { $elemMatch: peer } },
          { participants3: { $elemMatch: peer } },
          { participants4: { $elemMatch: peer } },
          { participants5: { $elemMatch: peer } }
        ]
      });
    }
  }
  const queryEnd = Date.now();

  const results = {
    'Average findOne time ms': +((queryEnd - queryStart) / numIterations).toFixed(2)
  };

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}
