'use strict';

const assert = require('assert');
const start = require('../common');

describe('Date Tutorial', function() {
  let User;

  const mongoose = new start.mongoose.Mongoose();

  before(function() {
    const userSchema = new mongoose.Schema({
      name: String,
      // `lastActiveAt` is a date
      lastActiveAt: Date
    });
    User = mongoose.model('User', userSchema);

    return mongoose.connect(start.uri);
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('Example 1.2: casts strings to dates', function() {
    const user = new User({
      name: 'Jean-Luc Picard',
      lastActiveAt: '2002-12-09'
    });
    user.lastActiveAt instanceof Date; // true
    // acquit:ignore:start
    assert.ok(user.lastActiveAt instanceof Date);
    // acquit:ignore:end
  });

  it('Example 1.3: cast error', function() {
    const user = new User({
      name: 'Jean-Luc Picard',
      lastActiveAt: 'not a date'
    });
    user.lastActiveAt instanceof Date; // false
    user.validateSync().errors['lastActiveAt']; // CastError
    // acquit:ignore:start
    assert.ok(!(user.lastActiveAt instanceof Date));
    assert.equal(user.validateSync().errors['lastActiveAt'].name, 'CastError');
    // acquit:ignore:end
  });

  it('Example 1.2.1: min, max', function() {
    const episodeSchema = new mongoose.Schema({
      title: String,
      airedAt: {
        type: Date,
        // The dates of the first and last episodes of
        // Star Trek: The Next Generation
        min: '1987-09-28',
        max: '1994-05-23'
      }
    });
    const Episode = mongoose.model('Episode', episodeSchema);

    const ok = new Episode({
      title: 'Encounter at Farpoint',
      airedAt: '1987-09-28'
    });
    ok.validateSync(); // No error
    // acquit:ignore:start
    assert.ifError(ok.validateSync());
    // acquit:ignore:end

    const bad = new Episode({
      title: 'What You Leave Behind',
      airedAt: '1999-06-02'
    });
    bad.airedAt; // "1999-06-02T00:00:00.000Z"

    // Path `airedAt` (Tue Jun 01 1999 20:00:00 GMT-0400 (EDT)) is after
    // maximum allowed value (Sun May 22 1994 20:00:00 GMT-0400 (EDT)).
    bad.validateSync();
    // acquit:ignore:start
    assert.ok(bad.airedAt instanceof Date);
    assert.ok(bad.validateSync().toString().includes('after maximum'));
    // acquit:ignore:end
  });

  describe('Example 1.3.1', function() {
    let Episode;

    before(async function() {
      const episodeSchema = new mongoose.Schema({
        title: String,
        airedAt: {
          type: Date,
          // The dates of the first and last episodes of
          // Star Trek: The Next Generation
          min: '1987-09-28',
          max: '1994-05-23'
        }
      });
      Episode = mongoose.model('Episode2', episodeSchema);

      await Episode.create([
        { title: 'Encounter at Farpoint', airedAt: '1987-09-28' },
        { title: 'The Last Outpost', airedAt: '1987-10-19' },
        { title: 'Where No One Has Gone Before', airedAt: '1987-10-26' }
      ]);
    });

    it('date queries', function() {
      // Find episodes that aired on this exact date
      return Episode.find({ airedAt: new Date('1987-10-26') }).
        then(episodes => {
          episodes[0].title; // "Where No One Has Gone Before"
          // acquit:ignore:start
          assert.equal(episodes[0].title, 'Where No One Has Gone Before');
          // acquit:ignore:end
          // Find episodes within a range of dates, sorted by date ascending
          return Episode.
            find({ airedAt: { $gte: '1987-10-19', $lte: '1987-10-26' } }).
            sort({ airedAt: 1 });
        }).
        then(episodes => {
          episodes[0].title; // "The Last Outpost"
          episodes[1].title; // "Where No One Has Gone Before"
          // acquit:ignore:start
          assert.equal(episodes[0].title, 'The Last Outpost');
          assert.equal(episodes[1].title, 'Where No One Has Gone Before');
          // acquit:ignore:end
        });
    });
  });

  it('Example 1.4.1: moment', function() {
    const moment = require('moment');
    const user = new User({
      name: 'Jean-Luc Picard',
      lastActiveAt: moment.utc('2002-12-09')
    });
    user.lastActiveAt; // "2002-12-09T00:00:00.000Z"
    // acquit:ignore:start
    assert.ok(user.lastActiveAt instanceof Date);
    assert.equal(user.lastActiveAt.toISOString(), '2002-12-09T00:00:00.000Z');
    // acquit:ignore:end
  });

  it('Example 1.4.3: numeric strings', function() {
    const user = new User({
      name: 'Jean-Luc Picard',
      lastActiveAt: '1552261496289'
    });
    user.lastActiveAt; // "2019-03-10T23:44:56.289Z"
    // acquit:ignore:start
    assert.ok(user.lastActiveAt instanceof Date);
    assert.equal(user.lastActiveAt.toISOString(), '2019-03-10T23:44:56.289Z');
    // acquit:ignore:end
  });
});
