// import async to make control flow simplier
var async = require('async');

// import the rest of the normal stuff
var mongoose = require('../../lib');

require('./person.js')();

var Person = mongoose.model('Person');

// define some dummy data
var data = [
  {
    name: 'bill',
    age: 25,
    birthday: new Date().setFullYear((new Date().getFullYear() - 25)),
    gender: 'Male',
    likes: ['movies', 'games', 'dogs'],
    loc: [0, 0]
  },
  {
    name: 'mary',
    age: 30,
    birthday: new Date().setFullYear((new Date().getFullYear() - 30)),
    gender: 'Female',
    likes: ['movies', 'birds', 'cats'],
    loc: [1, 1]
  },
  {
    name: 'bob',
    age: 21,
    birthday: new Date().setFullYear((new Date().getFullYear() - 21)),
    gender: 'Male',
    likes: ['tv', 'games', 'rabbits'],
    loc: [3, 3]
  },
  {
    name: 'lilly',
    age: 26,
    birthday: new Date().setFullYear((new Date().getFullYear() - 26)),
    gender: 'Female',
    likes: ['books', 'cats', 'dogs'],
    loc: [6, 6]
  },
  {
    name: 'alucard',
    age: 1000,
    birthday: new Date().setFullYear((new Date().getFullYear() - 1000)),
    gender: 'Male',
    likes: ['glasses', 'wine', 'the night'],
    loc: [10, 10]
  }
];


mongoose.connect('mongodb://localhost/persons', function(err) {
  if (err) {
    throw err;
  }

  // create all of the dummy people
  async.each(data, function(item, cb) {
    Person.create(item, cb);
  }, function(err) {
    if (err) {
      // handler error
    }

    // let's find the closest person to bob
    Person.find({name: 'bob'}, function(err, res) {
      if (err) {
        throw err;
      }

      res[0].findClosest(function(err, closest) {
        if (err) {
          throw err;
        }

        console.log('%s is closest to %s', res[0].name, closest);


        // we can also just query straight off of the model. For more
        // information about geospatial queries and indexes, see
        // http://docs.mongodb.org/manual/applications/geospatial-indexes/
        var coords = [7, 7];
        Person.find({loc: {$nearSphere: coords}}).limit(1).exec(function(err, res) {
          console.log('Closest to %s is %s', coords, res);
          cleanup();
        });
      });
    });
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
