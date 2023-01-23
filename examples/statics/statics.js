'use strict';
const mongoose = require('../../lib');


// import the schema
require('./person.js')();

// grab the person model object
const Person = mongoose.model('Person');

// connect to a server to do a quick write / read example
run().catch(console.error);

async function run() {
  await mongoose.connect('mongodb://127.0.0.1/persons');
  const bill = await Person.create({
    name: 'bill',
    age: 25,
    birthday: new Date().setFullYear((new Date().getFullYear() - 25))
  });
  console.log('People added to db: %s', bill.toString());

  // using the static
  const result = await Person.findPersonByName('bill');

  console.log(result);
  await cleanup();
}

async function cleanup() {
  await Person.remove();
  mongoose.disconnect();
}
