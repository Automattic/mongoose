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
let metadata;

async function capture(label, action) {
  let value;
  let error;
  try {
    value = await action();
  } catch (err) {
    error = err;
  }
  const result = error?.bulkWriteResult ?? error?.result ?? value;
  const entry = {
    label,
    outcome: error ? 'rejected' : 'fulfilled',
    error: error ? {
      name: error.name,
      code: error.code,
      message: error.message,
      numDocumentsNotUpdated: error.numDocumentsNotUpdated,
      documents: error.documents?.length,
      writeErrors: error.writeErrors?.map(err => ({ index: err.index, code: err.code }))
    } : null,
    result: result && typeof result.matchedCount === 'number' ? {
      insertedCount: result.insertedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    } : undefined
  };
  observations.push(entry);
  return { entry, value, error };
}

function show(entry) {
  console.log('DEEP_OBSERVATION ' + JSON.stringify(entry));
}

describe('gh-16713 deeper design observations (current upstream, no patch)', function() {
  this.timeout(20000);
  let db;
  let User;
  const savedNames = [];

  before(async function() {
    db = await start().asPromise();
    const buildInfo = await db.db.admin().command({ buildInfo: 1 });
    const hello = await db.db.admin().command({ hello: 1 });
    metadata = { node: process.version, mongoose: mongoose.version, mongodb: buildInfo.version, replicaSet: hello.setName };
    assert.ok(metadata.replicaSet, 'This probe needs the normal START_REPLICA_SET=1 fixture');
    const schema = new mongoose.Schema({ name: String, enabled: Boolean });
    schema.post('save', function() { savedNames.push(this.name); });
    User = db.model('BulkSave16713Deep', schema);
    await User.init();
    console.log('VERSIONS ' + JSON.stringify(metadata));
  });

  beforeEach(async function() {
    await User.deleteMany({});
    savedNames.length = 0;
  });

  after(async function() {
    fs.writeFileSync(path.join(outputDirectory, 'deep-observations.json'), JSON.stringify({ metadata, observations }, null, 2) + '\n');
    await db?.close();
  });

  it('distinguishes save filters for independent unchanged instances with the same _id', async function() {
    const original = await User.create({ name: 'original', enabled: true });
    const accepted = await User.findById(original._id);
    const rejected = await User.findById(original._id);
    const skippedByBulk = await User.findById(original._id);
    accepted.$where = { enabled: true };
    rejected.$where = { enabled: false };
    skippedByBulk.$where = { enabled: false };
    assert.ok([accepted, rejected, skippedByBulk].every(doc => !doc.isModified()));
    const idOnly = await User.collection.find({ _id: { $in: [original._id] } }, { projection: { _id: 1 } }).toArray();
    const combined = await User.collection.find({ $or: [
      { _id: original._id, enabled: true }, { _id: original._id, enabled: false }
    ] }, { projection: { _id: 1 } }).toArray();
    const good = await capture('same id, matching $where, save', () => accepted.save());
    const bad = await capture('same id, mismatching $where, save', () => rejected.save());
    const bulk = await capture('same id, mismatching $where, bulkSave', () => User.bulkSave([skippedByBulk]));
    assert.strictEqual(good.error, undefined);
    assert.ok(bad.error instanceof mongoose.Error.DocumentNotFoundError);
    assert.strictEqual(bulk.error, undefined);
    bulk.entry.idOnlyFindCount = idOnly.length;
    bulk.entry.projectedOrFindCount = combined.length;
    assert.strictEqual(idOnly.length, 1);
    assert.strictEqual(combined.length, 1);
    [good, bad, bulk].forEach(result => show(result.entry));
  });

  it('shows why a Model.find existence check differs from the raw collection read used by save', async function() {
    const schema = new mongoose.Schema({ name: String, enabled: Boolean });
    schema.pre('find', function() { this.where({ enabled: false }); });
    const Filtered = db.model('BulkSave16713FindMiddleware', schema);
    const doc = await Filtered.create({ name: 'exists', enabled: true });
    const modelRead = await Filtered.find({ _id: { $in: [doc._id] } }).select('_id');
    const collectionRead = await Filtered.collection.find({ _id: { $in: [doc._id] } }, { projection: { _id: 1 } }).toArray();
    const { entry, error } = await capture('query middleware versus save collection read', () => doc.save());
    entry.modelFindCount = modelRead.length;
    entry.collectionFindCount = collectionRead.length;
    assert.strictEqual(error, undefined);
    assert.strictEqual(modelRead.length, 0);
    assert.strictEqual(collectionRead.length, 1);
    show(entry);
  });

  it('shows an earlier insert can make a supposedly missing unchanged input exist', async function() {
    async function setup() {
      const retained = await User.create({ name: 'original' });
      await User.deleteOne({ _id: retained._id });
      const replacement = new User({ _id: retained._id, name: 'replacement' });
      assert.strictEqual(retained.isModified(), false);
      assert.strictEqual(await User.exists({ _id: retained._id }), null);
      return { retained, replacement };
    }
    const sequential = await setup();
    const saved = await capture('insert then unchanged save, same id, sequential', async() => {
      await sequential.replacement.save();
      await sequential.retained.save();
    });
    saved.entry.preflightWouldReportMissing = true;
    saved.entry.persistedName = (await User.findById(sequential.retained._id)).name;
    assert.strictEqual(saved.error, undefined);
    assert.strictEqual(saved.entry.persistedName, 'replacement');
    const batch = await setup();
    const bulk = await capture('insert then unchanged save, same id, bulkSave', () => User.bulkSave([batch.replacement, batch.retained], { ordered: true }));
    bulk.entry.preflightWouldReportMissing = true;
    bulk.entry.persistedName = (await User.findById(batch.retained._id)).name;
    assert.strictEqual(bulk.error, undefined);
    assert.strictEqual(bulk.entry.persistedName, 'replacement');
    [saved, bulk].forEach(result => show(result.entry));
  });

  for (const predicate of [true, false]) {
    it(`shows an earlier write reverses the preflight answer for enabled=${predicate}`, async function() {
      const original = await User.create({ name: 'shared', enabled: true });
      const writer = await User.findById(original._id);
      const unchanged = await User.findById(original._id);
      writer.enabled = false;
      unchanged.$where = { enabled: predicate };
      assert.strictEqual(unchanged.isModified(), false);
      const matchedBefore = await User.collection.findOne({ _id: original._id, enabled: predicate });
      const { entry, error } = await capture(`ordered sequential writes reverse predicate enabled=${predicate}`, async() => {
        await writer.save();
        await unchanged.save();
      });
      entry.matchedBeforeWrites = matchedBefore !== null;
      entry.storedEnabledAfterWrites = (await User.findById(original._id)).enabled;
      assert.strictEqual(entry.matchedBeforeWrites, predicate);
      assert.strictEqual(entry.storedEnabledAfterWrites, false);
      if (predicate) {
        assert.ok(error instanceof mongoose.Error.DocumentNotFoundError);
      } else {
        assert.strictEqual(error, undefined);
      }
      show(entry);
    });
  }

  for (const ordered of [true, false]) {
    for (const duplicateBeforeMissing of [true, false]) {
      it(`observes driver errors with ordered=${ordered}, duplicateBeforeMissing=${duplicateBeforeMissing}`, async function() {
        const occupied = await User.create({ name: 'occupied' });
        const missing = await User.create({ name: 'missing' });
        await User.deleteOne({ _id: missing._id });
        const before = new User({ name: 'before' });
        const duplicate = new User({ _id: occupied._id, name: 'duplicate' });
        const after = new User({ name: 'after' });
        const docs = duplicateBeforeMissing ? [before, duplicate, missing, after] : [before, missing, duplicate, after];
        savedNames.length = 0;
        const { entry, error } = await capture(`driver error; ordered=${ordered}; duplicateBeforeMissing=${duplicateBeforeMissing}`, () => User.bulkSave(docs, { ordered }));
        entry.missingInputIndex = docs.indexOf(missing);
        entry.failedInputIndex = docs.indexOf(duplicate);
        entry.beforePersisted = await User.exists({ _id: before._id }) !== null;
        entry.afterPersisted = await User.exists({ _id: after._id }) !== null;
        entry.missingPersisted = await User.exists({ _id: missing._id }) !== null;
        entry.postSaveHooks = savedNames.slice();
        assert.strictEqual(error.name, 'MongoBulkWriteError');
        assert.strictEqual(error.code, 11000);
        assert.strictEqual(error.writeErrors[0].index, 1);
        assert.strictEqual(entry.beforePersisted, true);
        assert.strictEqual(entry.afterPersisted, !ordered);
        assert.strictEqual(entry.missingPersisted, false);
        assert.strictEqual(savedNames.includes('missing'), !ordered || !duplicateBeforeMissing);
        show(entry);
      });
    }

    it(`observes incomplete-result counts and later writes with ordered=${ordered}`, async function() {
      const [unchanged, missingUpdate, laterUpdate] = await User.insertMany([
        { name: 'unchanged' }, { name: 'missing' }, { name: 'later-original' }
      ]);
      await User.deleteOne({ _id: missingUpdate._id });
      missingUpdate.name = 'missing-updated';
      laterUpdate.name = 'later-updated';
      savedNames.length = 0;
      const { entry, error } = await capture(`incomplete result with an existing unchanged input; ordered=${ordered}`, () => User.bulkSave([unchanged, missingUpdate, laterUpdate], { ordered }));
      entry.unchangedExists = await User.exists({ _id: unchanged._id }) !== null;
      entry.laterStoredName = (await User.findById(laterUpdate._id)).name;
      entry.postSaveHooks = savedNames.slice();
      assert.strictEqual(error.name, 'MongooseBulkSaveIncompleteError');
      assert.strictEqual(error.bulkWriteResult.matchedCount, 1);
      assert.strictEqual(error.numDocumentsNotUpdated, 2);
      assert.strictEqual(entry.unchangedExists, true);
      assert.strictEqual(entry.laterStoredName, 'later-updated');
      assert.deepStrictEqual(savedNames, []);
      show(entry);
    });
  }

  it('classifies the document after pre-save hooks have made it modified', async function() {
    const schema = new mongoose.Schema({ name: String });
    schema.pre('save', function() {
      if (!this.isNew) {
        this.name = 'changed-by-hook';
      }
    });
    const Hooked = db.model('BulkSave16713PreHook', schema);
    const doc = await Hooked.create({ name: 'original' });
    await Hooked.deleteOne({ _id: doc._id });
    assert.strictEqual(doc.isModified(), false);
    const { entry, error } = await capture('initially unchanged input modified by pre-save hook', () => Hooked.bulkSave([doc]));
    entry.isModifiedAfterHook = doc.isModified();
    assert.strictEqual(error.name, 'MongooseBulkSaveIncompleteError');
    assert.strictEqual(entry.isModifiedAfterHook, true);
    show(entry);
  });

  it('requires the existence read to share the session to see an uncommitted saved record', async function() {
    const session = await db.startSession();
    let doc;
    try {
      session.startTransaction();
      doc = new User({ name: 'uncommitted' });
      await doc.save({ session });
      assert.strictEqual(doc.isNew, false);
      assert.strictEqual(doc.isModified(), false);
      const outside = await User.collection.findOne({ _id: doc._id });
      const inside = await User.collection.findOne({ _id: doc._id }, { session });
      const { entry, error } = await capture('unchanged bulkSave inside a transaction', () => User.bulkSave([doc], { session, ordered: true }));
      entry.visibleWithoutSession = outside !== null;
      entry.visibleWithSession = inside !== null;
      assert.strictEqual(error, undefined);
      assert.strictEqual(entry.visibleWithoutSession, false);
      assert.strictEqual(entry.visibleWithSession, true);
      show(entry);
    } finally {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await session.endSession();
    }
    assert.strictEqual(await User.findById(doc._id), null);
  });
});
