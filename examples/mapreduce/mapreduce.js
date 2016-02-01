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
      gender: 'Male'
    },
    {
      name: 'mary',
      age: 30,
      birthday: new Date().setFullYear((new Date().getFullYear() - 30)),
      gender: 'Female'
    },
    {
      name: 'bob',
      age: 21,
      birthday: new Date().setFullYear((new Date().getFullYear() - 21)),
      gender: 'Male'
    },
    {
      name: 'lilly',
      age: 26,
      birthday: new Date().setFullYear((new Date().getFullYear() - 26)),
      gender: 'Female'
    },
    {
      name: 'alucard',
      age: 1000,
      birthday: new Date().setFullYear((new Date().getFullYear() - 1000)),
      gender: 'Male'
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

    // alright, simple map reduce example. We will find the total ages of each
    // gender

    // create the options object
    var o = {};

    o.map = function() {
      // in this function, 'this' refers to the current document being
      // processed. Return the (gender, age) tuple using
      /* global emit */
      emit(this.gender, this.age);
    };

    // the reduce function receives the array of ages that are grouped by the
    // id, which in this case is the gender
    o.reduce = function(id, ages) {
      return Array.sum(ages);
    };

    // other options that can be specified

    // o.query = { age : { $lt : 1000 }}; // the query object
    // o.limit = 3; // max number of documents
    // o.keeptemp = true; // default is false, specifies whether to keep temp data
    // o.finalize = someFunc; // function called after reduce
    // o.scope = {}; // the scope variable exposed to map/reduce/finalize
    // o.jsMode = true; // default is false, force execution to stay in JS
    o.verbose = true; // default is false, provide stats on the job
    // o.out = {}; // objects to specify where output goes, by default is
                   // returned, but can also be stored in a new collection
                   // see: http://mongoosejs.com/docs/api.html#model_Model.mapReduce
    Person.mapReduce(o, function(err, results, stats) {
      console.log('map reduce took %d ms', stats.processtime);
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
