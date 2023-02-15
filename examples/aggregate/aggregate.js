
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


mongoose.connect('mongodb://127.0.0.1/persons', function(err) {
  if (err) throw err;

  // create all of the dummy people
  async.each(data, function(item, cb) {
    Person.create(item, cb);
  }, function(err) {
    if (err) {
      // handle error
    }

    // run an aggregate query that will get all of the people who like a given
    // item. To see the full documentation on ways to use the aggregate
    // framework, see http://www.mongodb.com/docs/manual/core/aggregation/
    Person.aggregate(
      // select the fields we want to deal with
      { $project: { name: 1, likes: 1 } },
      // unwind 'likes', which will create a document for each like
      { $unwind: '$likes' },
      // group everything by the like and then add each name with that like to
      // the set for the like
      { $group: {
        _id: { likes: '$likes' },
        likers: { $addToSet: '$name' }
      } },
      function(err, result) {
        if (err) throw err;
        console.log(result);
        /* [
         { _id: { likes: 'the night' }, likers: [ 'alucard' ] },
         { _id: { likes: 'wine' }, likers: [ 'alucard' ] },
         { _id: { likes: 'books' }, likers: [ 'lilly' ] },
         { _id: { likes: 'glasses' }, likers: [ 'alucard' ] },
         { _id: { likes: 'birds' }, likers: [ 'mary' ] },
         { _id: { likes: 'rabbits' }, likers: [ 'bob' ] },
         { _id: { likes: 'cats' }, likers: [ 'lilly', 'mary' ] },
         { _id: { likes: 'dogs' }, likers: [ 'lilly', 'bill' ] },
         { _id: { likes: 'tv' }, likers: [ 'bob' ] },
         { _id: { likes: 'games' }, likers: [ 'bob', 'bill' ] },
         { _id: { likes: 'movies' }, likers: [ 'mary', 'bill' ] }
         ] */

        cleanup();
      });
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
