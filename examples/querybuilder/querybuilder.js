
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


mongoose.connect('mongodb://localhost/persons', function (err) {
  if (err) throw err;

  // create all of the dummy people
  async.each(data, function (item, cb) {
      Person.create(item, cb);
    }, function (err) {
    if (err) throw err;

    // when querying data, instead of providing a callback, you can instead
    // leave that off and get a query object returned
    var query = Person.find({ age : { $lt : 1000 }});

    // this allows you to continue applying modifiers to it
    query.sort('birthday');
    query.select('name');
    
    // you can chain them together as well
    // a full list of methods can be found:
    // http://mongoosejs.com/docs/api.html#query-js
    query.where('age').gt(21);

    // finally, when ready to execute the query, call the exec() function
    query.exec(function (err, results) {
      if (err) throw err;

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
