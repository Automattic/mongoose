'use strict';

const assert = require('assert');
const start = require('../common');

// This file is in `es-next` because it uses async/await for convenience

describe('Cast Tutorial', function() {
  let Character;
  const mongoose = new start.mongoose.Mongoose();

  before(async function() {
    const schema = new mongoose.Schema({ name: String, age: Number });
    Character = mongoose.model('Character', schema);

    await mongoose.connect(start.uri);

    await Character.deleteMany({});
    await Character.create({
      _id: '5cdc267dd56b5662b7b7cc0c',
      name: 'Jean-Luc Picard',
      age: 59
    });
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('get and set', async function() {
    const query = Character.find({ name: 'Jean-Luc Picard' });
    query.getFilter(); // `{ name: 'Jean-Luc Picard' }`
    // acquit:ignore:start
    assert.deepStrictEqual(query.getFilter(), { name: 'Jean-Luc Picard' });
    // acquit:ignore:end

    // Subsequent chained calls merge new properties into the filter
    query.find({ age: { $gt: 50 } });
    query.getFilter(); // `{ name: 'Jean-Luc Picard', age: { $gt: 50 } }`
    // acquit:ignore:start
    assert.deepStrictEqual(query.getFilter(), {
      name: 'Jean-Luc Picard',
      age: { $gt: 50 }
    });
    // acquit:ignore:end
  });

  it('cast values', async function() {
    // Note that `_id` and `age` are strings. Mongoose will cast `_id` to
    // a MongoDB ObjectId and `age.$gt` to a number.
    const query = Character.findOne({
      _id: '5cdc267dd56b5662b7b7cc0c',
      age: { $gt: '50' }
    });

    // `{ _id: '5cdc267dd56b5662b7b7cc0c', age: { $gt: '50' } }`
    // Query hasn't been executed yet, so Mongoose hasn't casted the filter.
    query.getFilter();
    // acquit:ignore:start
    assert.deepStrictEqual(query.getFilter(), {
      _id: '5cdc267dd56b5662b7b7cc0c',
      age: { $gt: '50' }
    });
    // acquit:ignore:end

    const doc = await query.exec();
    doc.name; // "Jean-Luc Picard"
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    // acquit:ignore:end

    // Mongoose casted the filter, so `_id` became an ObjectId and `age.$gt`
    // became a number.
    query.getFilter()._id instanceof mongoose.Types.ObjectId; // true
    typeof query.getFilter().age.$gt === 'number'; // true
    // acquit:ignore:start
    assert.ok(query.getFilter()._id instanceof mongoose.Types.ObjectId);
    assert.equal(typeof query.getFilter().age.$gt, 'number');
    // acquit:ignore:end
  });

  it('cast error', async function() {
    const query = Character.findOne({ age: { $lt: 'not a number' } });

    const err = await query.exec().then(() => null, err => err);
    err instanceof mongoose.CastError; // true
    // Cast to number failed for value "not a number" at path "age" for
    // model "Character"
    err.message;
    // acquit:ignore:start
    assert.ok(err instanceof mongoose.CastError);
    assert.equal(err.message, 'Cast to Number failed for value "not a ' +
      'number" (type string) at path "age" for model "Character"');
    // acquit:ignore:end
  });

  it('not in schema', async function() {
    const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

    // No error because `notInSchema` is not defined in the schema
    await query.exec();
  });

  it('strictQuery true', async function() {
    mongoose.deleteModel('Character');
    const schema = new mongoose.Schema({ name: String, age: Number }, {
      strictQuery: true
    });
    Character = mongoose.model('Character', schema);

    const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

    await query.exec();
    query.getFilter(); // Empty object `{}`, Mongoose removes `notInSchema`
    // acquit:ignore:start
    assert.deepEqual(query.getFilter(), {});
    // acquit:ignore:end
  });

  it('strictQuery throw', async function() {
    mongoose.deleteModel('Character');
    const schema = new mongoose.Schema({ name: String, age: Number }, {
      strictQuery: 'throw'
    });
    Character = mongoose.model('Character', schema);

    const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

    const err = await query.exec().then(() => null, err => err);
    err.name; // 'StrictModeError'
    // Path "notInSchema" is not in schema and strictQuery is 'throw'.
    err.message;
    // acquit:ignore:start
    assert.equal(err.name, 'StrictModeError');
    assert.equal(err.message, 'Path "notInSchema" is not in schema and ' +
      'strictQuery is \'throw\'.');
    // acquit:ignore:end
  });

  it('implicit in', async function() {
    // Normally wouldn't find anything because `name` is a string, but
    // Mongoose automatically inserts `$in`
    const query = Character.findOne({ name: ['Jean-Luc Picard', 'Will Riker'] });

    const doc = await query.exec();
    doc.name; // "Jean-Luc Picard"

    // `{ name: { $in: ['Jean-Luc Picard', 'Will Riker'] } }`
    query.getFilter();
    // acquit:ignore:start
    assert.equal(doc.name, 'Jean-Luc Picard');
    assert.deepEqual(query.getFilter(), {
      name: { $in: ['Jean-Luc Picard', 'Will Riker'] }
    });
    // acquit:ignore:end
  });
});
