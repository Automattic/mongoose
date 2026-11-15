'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, before, beforeEach, after, it } = require('mocha');
const start = require('../../../../test/common');
const outputDirectory = process.env.MONGOOSE_16713_OUTPUT_DIR || path.join(__dirname, '../results/local');
fs.mkdirSync(outputDirectory, { recursive: true });
const mongoose = start.mongoose;

const observations = [];
let recording = null;
let metadata;

async function observe(label, action) {
  let value;
  let error;
  const commands = [];
  recording = commands;
  try {
    value = await action();
  } catch (err) {
    error = err;
  } finally {
    recording = null;
  }
  const entry = {
    label,
    outcome: error ? 'rejected' : 'fulfilled',
    error: error ? { name: error.name, message: error.message } : null,
    result: value && typeof value.matchedCount === 'number' ? {
      insertedCount: value.insertedCount,
      matchedCount: value.matchedCount,
      modifiedCount: value.modifiedCount
    } : undefined,
    commands
  };
  observations.push(entry);
  return { entry, value, error };
}

describe('gh-16713 upstream observations (not a proposed public contract)', function() {
  let db;
  let User;
  const savedNames = [];

  before(async function() {
    db = await start({ monitorCommands: true }).asPromise();
    const buildInfo = await db.db.admin().command({ buildInfo: 1 });
    metadata = {
      node: process.version,
      mongoose: mongoose.version,
      driver: require('mongodb/package.json').version,
      mongodb: buildInfo.version
    };
    const schema = new mongoose.Schema({ name: String });
    schema.post('save', function() { savedNames.push(this.name); });
    User = db.model('BulkSave16713Probe', schema);
    await User.init();
    db.getClient().on('commandStarted', event => {
      if (recording && event.databaseName === db.name) {
        const command = event.command;
        recording.push({
          name: event.commandName,
          collection: command[event.commandName],
          ordered: command.ordered,
          operations: command.documents?.length ?? command.updates?.length
        });
      }
    });
    console.log('VERSIONS ' + JSON.stringify(metadata));
  });

  beforeEach(async function() {
    await User.deleteMany({});
    savedNames.length = 0;
  });

  after(async function() {
    fs.writeFileSync(path.join(outputDirectory, 'observations.json'), JSON.stringify({ metadata, observations }, null, 2) + '\n');
    await db?.close();
  });

  const methods = [
    { label: 'save', save: doc => doc.save() },
    { label: 'bulkSave default', save: doc => User.bulkSave([doc]) },
    { label: 'bulkSave ordered true', save: doc => User.bulkSave([doc], { ordered: true }) },
    { label: 'bulkSave ordered false', save: doc => User.bulkSave([doc], { ordered: false }) }
  ];

  for (const method of methods) {
    for (const missing of [false, true]) {
      it(`observes ${method.label} with an unchanged ${missing ? 'missing' : 'existing'} document`, async function() {
        const doc = await User.create({ name: 'unchanged' });
        assert.strictEqual(doc.isNew, false);
        assert.strictEqual(doc.isModified(), false);
        if (missing) {
          assert.strictEqual((await User.deleteOne({ _id: doc._id })).deletedCount, 1);
        }
        savedNames.length = 0;
        const { entry, error } = await observe(`${method.label}; missing=${missing}`, () => method.save(doc));
        entry.persisted = await User.exists({ _id: doc._id }) !== null;
        entry.postSaveHooks = savedNames.slice();
        entry.isModified = doc.isModified();
        assert.strictEqual(entry.persisted, !missing);
        if (method.label === 'save' && missing) {
          assert.ok(error instanceof mongoose.Error.DocumentNotFoundError);
        } else {
          assert.strictEqual(error, undefined);
        }
        assert.deepStrictEqual(entry.commands.map(command => command.name), method.label === 'save' ? ['find'] : []);
        console.log('OBSERVATION ' + JSON.stringify(entry));
      });
    }
  }

  for (const ordered of [undefined, true, false]) {
    const options = ordered === undefined ? {} : { ordered };
    const label = ordered === undefined ? 'default' : String(ordered);

    it(`observes writes before and after a missing unchanged input with ordered=${label}`, async function() {
      const [before, missing, after] = await User.insertMany([
        { name: 'before-original' }, { name: 'missing' }, { name: 'after-original' }
      ]);
      assert.strictEqual((await User.deleteOne({ _id: missing._id })).deletedCount, 1);
      before.name = 'before-updated';
      after.name = 'after-updated';
      const insertedBefore = new User({ name: 'before-inserted' });
      const insertedAfter = new User({ name: 'after-inserted' });
      const docs = [before, insertedBefore, missing, after, insertedAfter];
      assert.strictEqual(missing.isModified(), false);
      const { entry, error } = await observe(`mixed batch; ordered=${label}`, () => User.bulkSave(docs, options));
      const stored = await Promise.all(docs.map(doc => User.findById(doc._id).lean()));
      entry.persistedNames = stored.map(doc => doc?.name ?? null);
      entry.postSaveHooks = savedNames.slice();
      entry.isNew = docs.map(doc => doc.isNew);
      entry.isModified = docs.map(doc => doc.isModified());
      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(entry.persistedNames, ['before-updated', 'before-inserted', null, 'after-updated', 'after-inserted']);
      assert.strictEqual(entry.result.insertedCount, 2);
      assert.strictEqual(entry.result.matchedCount, 2);
      console.log('OBSERVATION ' + JSON.stringify(entry));
    });

    it(`observes one update command with unchanged inputs and ordered=${label}`, async function() {
      const [before, missing, after] = await User.insertMany([
        { name: 'before-original' }, { name: 'missing' }, { name: 'after-original' }
      ]);
      await User.deleteOne({ _id: missing._id });
      before.name = 'before-updated';
      after.name = 'after-updated';
      const { entry, error } = await observe(`updates only; ordered=${label}`, () => User.bulkSave([before, missing, after], options));
      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(entry.commands.map(command => command.name), ['update']);
      assert.strictEqual(entry.commands[0].operations, 2);
      console.log('OBSERVATION ' + JSON.stringify(entry));
    });
  }

  it('measures the proposed batched existence read separately from bulkSave', async function() {
    const docs = await User.insertMany([{ name: 'first' }, { name: 'missing' }, { name: 'last' }]);
    await User.deleteOne({ _id: docs[1]._id });
    const { entry, value, error } = await observe('standalone batched existence query (no patch)', () =>
      User.collection.find({ _id: { $in: docs.map(doc => doc._id) } }, { projection: { _id: 1 } }).toArray());
    assert.strictEqual(error, undefined);
    assert.strictEqual(value.length, 2);
    assert.deepStrictEqual(entry.commands.map(command => command.name), ['find']);
    entry.foundCount = value.length;
    console.log('OBSERVATION ' + JSON.stringify(entry));
  });
});
