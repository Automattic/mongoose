
var mongoose = require('../../lib');
var Schema = mongoose.Schema;

console.log('Running mongoose version %s', mongoose.version);

/**
 * Console schema
 */

var consoleSchema = Schema({
    name: String
  , manufacturer: String
  , released: Date
});
var Console = mongoose.model('Console', consoleSchema);

/**
 * Game schema
 */

var gameSchema = Schema({
    name: String
  , developer: String
  , released: Date
  , consoles: [{ type: Schema.Types.ObjectId, ref: 'Console' }]
});
var Game = mongoose.model('Game', gameSchema);

/**
 * Connect to the console database on localhost with
 * the default port (27017)
 */

mongoose.connect('mongodb://localhost/console', function (err) {
  // if we failed to connect, abort
  if (err) throw err;

  // we connected ok
  createData();
});

/**
 * Data generation
 */

function createData () {
  Console.create({
      name: 'Nintendo 64'
    , manufacturer: 'Nintendo'
    , released: 'September 29, 1996'
  }, function (err, nintendo64) {
    if (err) return done(err);

    Game.create({
        name: 'Legend of Zelda: Ocarina of Time'
      , developer: 'Nintendo'
      , released: new Date('November 21, 1998')
      , consoles: [nintendo64]
    }, function (err) {
      if (err) return done(err);
      example();
    });
  });
}

/**
 * Population
 */

function example () {
  Game
  .findOne({ name: /^Legend of Zelda/ })
  .exec(function (err, ocinara) {
    if (err) return done(err);

    console.log('"%s" console _id: %s', ocinara.name, ocinara.consoles[0]);

    // population of existing document
    ocinara.populate('consoles', function (err) {
      if (err) return done(err);

      console.log(
          '"%s" was released for the %s on %s'
        , ocinara.name
        , ocinara.consoles[0].name
        , ocinara.released.toLocaleDateString());

      done();
    });
  });
}

function done (err) {
  if (err) console.error(err);
  Console.remove(function () {
    Game.remove(function () {
      mongoose.disconnect();
    });
  });
}
