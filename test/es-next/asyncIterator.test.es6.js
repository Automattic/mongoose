'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;

describe('asyncIterator', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('works (gh-6737)', async function() {
    const schema = new mongoose.Schema({ name: String });
    const Movie = db.model('gh6737_Movie', schema);

    await Movie.create([
      { name: 'Kickboxer' },
      { name: 'Ip Man' },
      { name: 'Enter the Dragon' }
    ]);

    let names = [];
    for await (const doc of Movie.find().sort({ name: 1 })) {
      names.push(doc.name);
    }

    assert.deepEqual(names, ['Enter the Dragon', 'Ip Man', 'Kickboxer']);
  });
});