
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
    Date().getFullYear() - 1000)) },
];


// to connect to a replica set, pass in the replSet option with the rs_name set
// to the replica set id. Then specify the uris of the mongod instances in the
// connect method as demonstrated below.
var opts = {
  replSet : { rs_name : "rs0" }
};
mongoose.connect('mongodb://localhost:27018/persons, localhost:27019/persons, localhost:27020/persons', opts, function (err) {
  if (err) throw err;

  // create all of the dummy people
  async.each(data, function (item, cb) {
      Person.create(item, cb);
    }, function (err) {
     
      // create and delete some data
      var prom = Person.find({age : { $lt : 1000 }}).exec();
      
      prom.then(function (people) {
        console.log("young people: %s", people);
      }).then(cleanup);
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
