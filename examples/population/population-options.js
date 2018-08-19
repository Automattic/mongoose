
'use strict';
const mongoose = require('../../lib');
const Schema = mongoose.Schema;

console.log('Running mongoose version %s', mongoose.version);

/**
 * Console schema
 */

const consoleSchema = Schema({
  name: String,
  manufacturer: String,
  released: Date
});
const Console = mongoose.model('Console', consoleSchema);

/**
 * Game schema
 */

const gameSchema = Schema({
  name: String,
  developer: String,
  released: Date,
  consoles: [{
    type: Schema.Types.ObjectId,
    ref: 'Console'
  }]
});
const Game = mongoose.model('Game', gameSchema);

/**
 * Connect to the console database on localhost with
 * the default port (27017)
 */

mongoose.connect('mongodb://localhost/console', function(err) {
  // if we failed to connect, abort
  if (err) throw err;

  // we connected ok
  createData();
});

/**
 * Data generation
 */

function createData() {
  Console.create(
    {
      name: 'Nintendo 64',
      manufacturer: 'Nintendo',
      released: 'September 29, 1996'
    },
    {
      name: 'Super Nintendo',
      manufacturer: 'Nintendo',
      released: 'August 23, 1991'
    },
    {
      name: 'XBOX 360',
      manufacturer: 'Microsoft',
      released: 'November 22, 2005'
    },
    function(err, nintendo64, superNintendo, xbox360) {
      if (err) return done(err);

      Game.create(
        {
          name: 'Legend of Zelda: Ocarina of Time',
          developer: 'Nintendo',
          released: new Date('November 21, 1998'),
          consoles: [nintendo64]
        },
        {
          name: 'Mario Kart',
          developer: 'Nintendo',
          released: 'September 1, 1992',
          consoles: [superNintendo]
        },
        {
          name: 'Perfect Dark Zero',
          developer: 'Rare',
          released: 'November 17, 2005',
          consoles: [xbox360]
        },
        function(err) {
          if (err) return done(err);
          example();
        }
      );
    }
  );
}

/**
 * Population
 */

function example() {
  Game
    .find({})
    .populate({
      path: 'consoles',
      match: {manufacturer: 'Nintendo'},
      select: 'name',
      options: {comment: 'population'}
    })
    .exec(function(err, games) {
      if (err) return done(err);

      games.forEach(function(game) {
        console.log(
          '"%s" was released for the %s on %s',
          game.name,
          game.consoles.length ? game.consoles[0].name : '??',
          game.released.toLocaleDateString()
        );
      });

      return done();
    });
}

/**
 * Clean up
 */

function done(err) {
  if (err) console.error(err);
  Console.remove(function() {
    Game.remove(function() {
      mongoose.disconnect();
    });
  });
}
