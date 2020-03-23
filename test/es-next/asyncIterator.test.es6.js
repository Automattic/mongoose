'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;

describe('asyncIterator', function() {
  let db;
  let Movie;

  before(async function() {
    db = await start();

    const schema = new mongoose.Schema({ name: String });
    await db.dropCollection('Movie').catch(() => {});
    db.deleteModel(/Movie/);
    Movie = db.model('Movie', schema);

    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);
  });

  after(function(done) {
    db.close(done);
  });

  it('supports for/await/of on a query (gh-6737)', async function() {
    let names = [];
    for await (const doc of Movie.find().sort({ name: 1 })) {
      names.push(doc.name);
    }

    assert.deepEqual(names, ['Enter the Dragon', 'Ip Man', 'Kickboxer']);
  });

  it('supports for/await/of on a query (gh-6737)', async function() {
    let names = [];
    for await (const doc of Movie.aggregate([{ $sort: { name: -1 } }])) {
      names.push(doc.name);
    }

    assert.deepEqual(names, ['Kickboxer', 'Ip Man', 'Enter the Dragon']);
  });
});