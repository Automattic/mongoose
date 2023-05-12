'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_test', {
    serverSelectionTimeoutMS: 5000
  });

  const minisMap = new mongoose.Schema(
    {
      //? Mini reference
      mini: {
        type: Map,
        of: new mongoose.Schema({
          //? Mini ID
          miniID: { type: mongoose.Schema.Types.ObjectId, ref: 'Mini', required: true },
          //? Timestamp as number
          timestamp: { type: Number, required: true },
        }),
      },
    },
    //? Automatic creation of timestamps for creation and updating.
    //? This will be created on the background by the package
    { timestamps: true }
  );
  const MinisMap = mongoose.model('MinisMap', minisMap);
  await MinisMap.init();
  
  const mini = new Map();
  for (let i = 0; i < 2000; ++i) {
    const miniID = new mongoose.Types.ObjectId();
    mini.set(miniID, {
      miniID,
      timestamp: Math.floor(Math.random() * 1000000)
    });
  }

  let loopStart = Date.now();

  for (let k = 0; k < 10; k++) {
    await MinisMap.create({ mini });
  }

  const results = {
    'Average save time ms': (Date.now() - loopStart) / 10
  };

  console.log(JSON.stringify(results, null, '  '));
}