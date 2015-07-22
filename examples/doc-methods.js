
var mongoose = require('mongoose')
var Schema = mongoose.Schema;

console.log('Running mongoose version %s', mongoose.version);

/**
 * Schema
 */

var CharacterSchema = Schema({
    name: { type: String, required: true }
  , health: { type: Number, min: 0, max: 100 }
})

/**
 * Methods
 */

CharacterSchema.methods.attack = function () {
  console.log('%s is attacking', this.name);
}

/**
 * Character model
 */

var Character = mongoose.model('Character', CharacterSchema);

/**
 * Connect to the database on localhost with
 * the default port (27017)
 */

var dbname = 'mongoose-example-doc-methods-' + ((Math.random()*10000)|0);
var uri = 'mongodb://localhost/' + dbname;

console.log('connecting to %s', uri);

mongoose.connect(uri, function (err) {
  // if we failed to connect, abort
  if (err) throw err;

  // we connected ok
  example();
})

/**
 * Use case
 */

function example () {
  Character.create({ name: 'Link', health: 100 }, function (err, link) {
    if (err) return done(err);
    console.log('found', link);
    link.attack(); // 'Link is attacking'
    done();
  })
}

/**
 * Clean up
 */

function done (err) {
  if (err) console.error(err);
  mongoose.connection.db.dropDatabase(function () {
    mongoose.disconnect();
  })
}
