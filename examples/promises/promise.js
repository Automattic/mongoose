
// import async to make control flow simplier
var async = require('async');

// import the rest of the normal stuff
var mongoose = require('../../lib');

require('./person.js')();

var Person = mongoose.model('Person');

// define some dummy data
var data = [
  { name : 'bill', age : 25, birthday : new Date().setFullYear((new
    Date().getFullYear() - 25)) },
  { name : 'mary', age : 30, birthday : new Date().setFullYear((new
    Date().getFullYear() - 30)) },
  { name : 'bob', age : 21, birthday : new Date().setFullYear((new
    Date().getFullYear() - 21)) },
  { name : 'lilly', age : 26, birthday : new Date().setFullYear((new
    Date().getFullYear() - 26)) },
  { name : 'alucard', age : 1000, birthday : new Date().setFullYear((new
    Date().getFullYear() - 1000)) }
];


mongoose.connect('mongodb://localhost/persons', function (err) {
  if (err) throw err;

  // create all of the dummy people
  async.each(data, function (item, cb) {
      Person.create(item, cb);
    }, function (err) {
      if (err) {
        // handle error
      }

      // create a promise (get one from the query builder)
      var prom = Person.find({age : { $lt : 1000 }}).exec();

      // add a callback on the promise. This will be called on both error and
      // complete
      prom.addBack(function () { console.log("completed"); });

      // add a callback that is only called on complete (success) events
      prom.addCallback(function () { console.log("Successful Completion!"); });

      // add a callback that is only called on err (rejected) events
      prom.addErrback(function () { console.log("Fail Boat"); });

      // you can chain things just like in the promise/A+ spec
      // note: each then() is returning a new promise, so the above methods
      // that we defined will all fire after the initial promise is fulfilled
      prom.then(function (people) {

        // just getting the stuff for the next query
        var ids = people.map(function (p) {
          return p._id;
        });

        // return the next promise
        return Person.find({ _id : { $nin : ids }}).exec();
      }).then(function (oldest) {
        console.log("Oldest person is: %s", oldest);
      }).then(cleanup);
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
