'use strict';

// Checks the `writeConcern` each write operation actually sends to the server.

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const WRITE_COMMANDS = new Set(['insert', 'update', 'delete', 'findAndModify']);

describe('write concern options', function() {
  let db;
  let sentWriteConcerns = [];

  function onCommandStarted(ev) {
    if (WRITE_COMMANDS.has(ev.commandName)) {
      sentWriteConcerns.push(ev.command.writeConcern == null ? null : { ...ev.command.writeConcern });
    }
  }

  before(async function() {
    db = start({ monitorCommands: true });
    await db.asPromise();
    db.getClient().on('commandStarted', onCommandStarted);
  });

  after(async function() {
    db.getClient().off('commandStarted', onCommandStarted);
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));

  async function captureWriteConcern(fn) {
    sentWriteConcerns = [];
    await fn();
    assert.equal(sentWriteConcerns.length, 1, 'expected exactly one write command');
    return sentWriteConcerns[0];
  }

  const options = () => ({ w: 1, j: true, wtimeout: 500 });
  const expected = { w: 1, j: true, wtimeout: 500 };

  describe('top-level w, j, wtimeout are sent as writeConcern', function() {
    let Test;
    let doc;
    beforeEach(async function() {
      Test = db.model('Test', new Schema({ name: String, tags: [String] }));
      doc = await Test.create({ name: 'a' });
    });

    const cases = {
      'Document.prototype.save() (insert)': () => new Test({ name: 'b' }).save(options()),
      'Document.prototype.save() (update)': () => { doc.name = 'b'; return doc.save(options()); },
      'Model.create()': () => Test.create([{ name: 'b' }], options()),
      'Model.insertOne()': () => Test.insertOne({ name: 'b' }, options()),
      'Model.insertMany()': () => Test.insertMany([{ name: 'b' }], options()),
      'Model.bulkWrite()': () => Test.bulkWrite([{ insertOne: { document: { name: 'b' } } }], options()),
      'Model.bulkSave()': () => { doc.name = 'b'; return Test.bulkSave([doc], options()); },
      'Model.updateOne()': () => Test.updateOne({}, { name: 'b' }, options()),
      'Model.updateMany()': () => Test.updateMany({}, { name: 'b' }, options()),
      'Model.replaceOne()': () => Test.replaceOne({}, { name: 'b' }, options()),
      'Model.deleteOne()': () => Test.deleteOne({}, options()),
      'Model.deleteMany()': () => Test.deleteMany({}, options()),
      'Model.findOneAndUpdate()': () => Test.findOneAndUpdate({}, { name: 'b' }, options()),
      'Model.findOneAndReplace()': () => Test.findOneAndReplace({}, { name: 'b' }, options()),
      'Model.findOneAndDelete()': () => Test.findOneAndDelete({}, options()),
      'Document.prototype.updateOne()': () => doc.updateOne({ name: 'b' }, options()),
      'Document.prototype.deleteOne()': () => doc.deleteOne(options()),
      'Query.prototype.w(), j(), wtimeout()': () => Test.updateOne({}, { name: 'b' }).w(1).j(true).wtimeout(500)
    };

    for (const [name, fn] of Object.entries(cases)) {
      it(name, async function() {
        assert.deepStrictEqual(await captureWriteConcern(fn), expected);
      });
    }
  });

  describe('with schema-level writeConcern', function() {
    let Test;
    beforeEach(async function() {
      const schema = new Schema({ name: String }, { writeConcern: { w: 'majority', j: true } });
      Test = db.model('Test', schema);
      await Test.create({ name: 'a' });
    });

    it('top-level options override schema-level writeConcern on save()', async function() {
      const sent = await captureWriteConcern(() => new Test({ name: 'b' }).save({ w: 1, wtimeout: 500 }));
      assert.deepStrictEqual(sent, { w: 1, j: true, wtimeout: 500 });
    });

    it('passes `writeConcern` option to save()', async function() {
      const sent = await captureWriteConcern(() => new Test({ name: 'b' }).save({ writeConcern: { w: 1, j: false } }));
      assert.deepStrictEqual(sent, { w: 1, j: false });
    });

    it('preserves falsy top-level options on queries', async function() {
      const sent = await captureWriteConcern(() => Test.updateOne({}, { name: 'b' }, { w: 1, j: false }));
      assert.deepStrictEqual(sent, { w: 1, j: false });
    });

    it('applies schema-level writeConcern to insertMany()', async function() {
      const sent = await captureWriteConcern(() => Test.insertMany([{ name: 'b' }]));
      assert.deepStrictEqual(sent, { w: 'majority', j: true });
    });

    it('applies schema-level writeConcern to bulkWrite()', async function() {
      const sent = await captureWriteConcern(() => Test.bulkWrite([{ insertOne: { document: { name: 'b' } } }]));
      assert.deepStrictEqual(sent, { w: 'majority', j: true });
    });

    it('applies schema-level writeConcern to bulkSave()', async function() {
      const sent = await captureWriteConcern(() => Test.bulkSave([new Test({ name: 'b' })]));
      assert.deepStrictEqual(sent, { w: 'majority', j: true });
    });
  });

  it('does not mutate user-provided options', async function() {
    const Test = db.model('Test', new Schema({ name: String }, { writeConcern: { w: 'majority' } }));
    const insertManyOptions = { w: 1 };
    const bulkWriteOptions = { w: 1 };
    await Test.insertMany([{ name: 'a' }], insertManyOptions);
    await Test.bulkWrite([{ insertOne: { document: { name: 'b' } } }], bulkWriteOptions);
    assert.deepStrictEqual(insertManyOptions, { w: 1 });
    assert.deepStrictEqual(bulkWriteOptions, { w: 1 });
  });
});
