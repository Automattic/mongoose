'use strict';

const mongoose = require('../');

run().catch(err => {
  console.error(err);
  process.exit(-1);
});

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark', {
    serverSelectionTimeoutMS: 5000
  });

  const ChildSchema = new mongoose.Schema({ name: String, parentId: 'ObjectId' });
  ChildSchema.virtual('answer').get(function() { return 42; });
  const ChildModel = mongoose.model('Child', ChildSchema);

  const ParentSchema = new mongoose.Schema({
    name: String
  });
  ParentSchema.virtual('child1', { ref: 'Child', localField: '_id', foreignField: 'parentId' });
  ParentSchema.virtual('child2', { ref: 'Child', localField: '_id', foreignField: 'parentId' });
  ParentSchema.virtual('child3', { ref: 'Child', localField: '_id', foreignField: 'parentId' });
  ParentSchema.virtual('child4', { ref: 'Child', localField: '_id', foreignField: 'parentId' });
  const ParentModel = mongoose.model('Parent', ParentSchema);
  
  if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
    await ParentModel.deleteMany({});
    await ChildModel.deleteMany({});

    const numDocs = 200;
    const parents = [];
    for (let i = 0; i < numDocs; ++i) {
      const parent = await ParentModel.create({ name: 'test parent ' + i });
      const children = [];
      console.log(`${i} / ${numDocs}`);
      for (let j = 0; j < numDocs; ++j) {
        children.push({ name: 'test child ' + i + '_' + j, parentId: parent._id });
      }
      await ChildModel.create(children);
      parents.push(parent);
    }
  }

  const docs = await ParentModel.find().populate(['child1', 'child2', 'child3', 'child4']);
  for (const doc of docs) {
    doc.name = 'test parent';
  }
  const loopStart = Date.now();

  docs.forEach(doc => doc.toObject({ virtuals: true }));

  const results = {
    'Total toObject time ms': Date.now() - loopStart
  };

  console.log(JSON.stringify(results, null, '  '));
  process.exit(0);
}