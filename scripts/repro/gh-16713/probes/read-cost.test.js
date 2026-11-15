'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, after, it } = require('mocha');
const start = require('../../../../test/common');
const outputDirectory = process.env.MONGOOSE_16713_OUTPUT_DIR || path.join(__dirname, '../results/local');
fs.mkdirSync(outputDirectory, { recursive: true });
const observations = [];

describe('gh-16713 projected existence-read command cost', function() {
  this.timeout(20000);
  let db;

  after(async function() {
    fs.writeFileSync(path.join(outputDirectory, 'read-cost.json'), JSON.stringify(observations, null, 2) + '\n');
    await db?.close();
  });

  it('compares unchanged bulkSave with a projected batched read at 1, 100, and 10000 inputs', async function() {
    db = await start({ monitorCommands: true }).asPromise();
    const User = db.model('BulkSave16713ReadCost', new start.mongoose.Schema({ ordinal: Number }));
    await User.init();
    const docs = await User.insertMany(Array.from({ length: 10000 }, (_, ordinal) => ({ ordinal })));
    assert.ok(docs.every(doc => !doc.isNew && !doc.isModified()));
    let recording = null;
    db.getClient().on('commandStarted', event => {
      if (recording && event.databaseName === db.name) {
        recording.push(event.commandName);
      }
    });
    for (const size of [1, 100, 10000]) {
      const subset = docs.slice(0, size);
      const bulkCommands = [];
      recording = bulkCommands;
      await User.bulkSave(subset);
      recording = null;
      const readCommands = [];
      recording = readCommands;
      const found = await User.collection.find({ _id: { $in: subset.map(doc => doc._id) } }, { projection: { _id: 1 } }).toArray();
      recording = null;
      assert.deepStrictEqual(bulkCommands, []);
      assert.strictEqual(found.length, size);
      assert.strictEqual(readCommands[0], 'find');
      const entry = { size, bulkCommands, readCommands, foundCount: found.length };
      observations.push(entry);
      console.log('READ_COST ' + JSON.stringify(entry));
    }
    assert.ok(observations[2].readCommands.includes('getMore'));
  });
});
