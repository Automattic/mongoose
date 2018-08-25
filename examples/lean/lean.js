
// import async to make control flow simplier
'use strict';

const async = require('async');

// import the rest of the normal stuff
const mongoose = require('../../lib');

require('./person.js')();

const Person = mongoose.model('Person');

// define some dummy data
const data = [
  {
    name: 'bill',
    age: 25,
    birthday: new Date().setFullYear((new Date().getFullYear() - 25)),
    gender: 'Male',
    likes: ['movies', 'games', 'dogs']
  },
  {
    name: 'mary',
    age: 30,
    birthday: new Date().setFullYear((new Date().getFullYear() - 30)),
    gender: 'Female',
    likes: ['movies', 'birds', 'cats']
  },
  {
    name: 'bob',
    age: 21,
    birthday: new Date().setFullYear((new Date().getFullYear() - 21)),
    gender: 'Male',
    likes: ['tv', 'games', 'rabbits']
  },
  {
    name: 'lilly',
    age: 26,
    birthday: new Date().setFullYear((new Date().getFullYear() - 26)),
    gender: 'Female',
    likes: ['books', 'cats', 'dogs']
  },
  {
    name: 'alucard',
    age: 1000,
    birthday: new Date().setFullYear((new Date().getFullYear() - 1000)),
    gender: 'Male',
    likes: ['glasses', 'wine', 'the night']
  }
];


mongoose.connect('mongodb://localhost/persons', function(err) {
  if (err) throw err;

  // create all of the dummy people
  async.each(data, function(item, cb) {
    Person.create(item, cb);
  }, function(err) {
    if (err) {
      // handle error
    }

    // lean queries return just plain javascript objects, not
    // MongooseDocuments. This makes them good for high performance read
    // situations

    // when using .lean() the default is true, but you can explicitly set the
    // value by passing in a boolean value. IE. .lean(false)
    const q = Person.find({age: {$lt: 1000}}).sort('age').limit(2).lean();
    q.exec(function(err, results) {
      if (err) throw err;
      console.log('Are the results MongooseDocuments?: %s', results[0] instanceof mongoose.Document);

      console.log(results);
      cleanup();
    });
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
