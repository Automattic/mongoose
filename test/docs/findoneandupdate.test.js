'use strict';

const assert = require('assert');
const start = require('../common');

// This file is in `es-next` because it uses async/await for convenience

describe('Tutorial: findOneAndUpdate()', function() {
  const mongoose = new start.mongoose.Mongoose();
  let Character;

  before(async function() {
    await mongoose.connect(start.uri);

    await mongoose.connection.dropDatabase();
  });

  beforeEach(async function() {
    mongoose.connection.deleteModel(/Character/);
    Character = mongoose.model('Character', new mongoose.Schema({
      name: String,
      age: Number
    }));

    await mongoose.model('Character').deleteMany({});
    await Character.create({ name: 'Jean-Luc Picard' });
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('basic case', async function() {
    // acquit:ignore:start
    await mongoose.model('Character').deleteMany({});
    mongoose.connection.deleteModel(/Character/);
    // acquit:ignore:end
    const Character = mongoose.model('Character', new mongoose.Schema({
      name: String,
      age: Number
    }));

    await Character.create({ name: 'Jean-Luc Picard' });

    const filter = { name: 'Jean-Luc Picard' };
    const update = { age: 59 };

    // `doc` is the document _before_ `update` was applied
    let doc = await Character.findOneAndUpdate(filter, update);
    doc.name; // 'Jean-Luc Picard'
    doc.age; // undefined
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    assert.equal(doc.age, undefined);
    // acquit:ignore:end

    doc = await Character.findOne(filter);
    doc.age; // 59
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    assert.equal(doc.age, 59);
    // acquit:ignore:end
  });

  it('new option', async function() {
    const filter = { name: 'Jean-Luc Picard' };
    const update = { age: 59 };

    // `doc` is the document _after_ `update` was applied because of
    // `new: true`
    const doc = await Character.findOneAndUpdate(filter, update, {
      new: true
    });
    doc.name; // 'Jean-Luc Picard'
    doc.age; // 59
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    assert.equal(doc.age, 59);
    // acquit:ignore:end
  });

  it('returnOriginal option', async function() {
    const filter = { name: 'Jean-Luc Picard' };
    const update = { age: 59 };

    // `doc` is the document _after_ `update` was applied because of
    // `returnOriginal: false`
    const doc = await Character.findOneAndUpdate(filter, update, {
      returnOriginal: false
    });
    doc.name; // 'Jean-Luc Picard'
    doc.age; // 59
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    assert.equal(doc.age, 59);
    // acquit:ignore:end
  });

  it('save race condition', async function() {
    const filter = { name: 'Jean-Luc Picard' };
    const update = { age: 59 };

    let doc = await Character.findOne({ name: 'Jean-Luc Picard' });

    // Document changed in MongoDB, but not in Mongoose
    await Character.updateOne(filter, { name: 'Will Riker' });

    // This will update `doc` age to `59`, even though the doc changed.
    doc.age = update.age;
    await doc.save();

    doc = await Character.findOne();
    doc.name; // Will Riker
    doc.age; // 59
    // acquit:ignore:start
    assert.equal(doc.name, 'Will Riker');
    assert.equal(doc.age, 59);
    // acquit:ignore:end
  });

  it('upsert', async function() {
    const filter = { name: 'Will Riker' };
    const update = { age: 29 };

    await Character.countDocuments(filter); // 0
    // acquit:ignore:start
    assert.equal(await Character.countDocuments(filter), 0);
    // acquit:ignore:end

    const doc = await Character.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true // Make this update into an upsert
    });
    doc.name; // Will Riker
    doc.age; // 29
    // acquit:ignore:start
    assert.equal(doc.name, 'Will Riker');
    assert.equal(doc.age, 29);
    // acquit:ignore:end
  });

  it('rawResult', async function() {
    const filter = { name: 'Will Riker' };
    const update = { age: 29 };

    await Character.countDocuments(filter); // 0
    // acquit:ignore:start
    assert.equal(await Character.countDocuments(filter), 0);
    // acquit:ignore:end

    const res = await Character.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      rawResult: true // Return the raw result from the MongoDB driver
    });

    res.value instanceof Character; // true
    // The below property will be `false` if MongoDB upserted a new
    // document, and `true` if MongoDB updated an existing object.
    res.lastErrorObject.updatedExisting; // false
    // acquit:ignore:start
    assert.ok(res.value instanceof Character);
    assert.ok(!res.lastErrorObject.updatedExisting);
    // acquit:ignore:end
  });
});
