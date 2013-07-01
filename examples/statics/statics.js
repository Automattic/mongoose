
var mongoose = require('../../lib');


// import the schema
require('./person.js')();

// grab the person model object
var Person = mongoose.model("Person");

// connect to a server to do a quick write / read example

mongoose.connect('mongodb://localhost/persons', function(err) {
  if (err) throw err;

  Person.create({
    name : 'bill',
    age : 25,
    birthday : new Date().setFullYear((new Date().getFullYear() - 25))
  }, function (err, bill) {
    if (err) throw err;
    console.log("People added to db: %s", bill.toString());

    // using the static
    Person.findPersonByName('bill', function(err, result) {
      if (err) throw err;
      
      console.log(result);
      cleanup();
    });
  });
});

function cleanup() {
  Person.remove(function() {
    mongoose.disconnect();
  });
}
