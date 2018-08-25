// import the necessary modules
'use strict';

const mongoose = require('../../lib');
const Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
  // define schema
  const PersonSchema = new Schema({
    name: String,
    age: Number,
    birthday: Date
  });

  // define a static
  PersonSchema.statics.findPersonByName = function(name, cb) {
    this.find({name: new RegExp(name, 'i')}, cb);
  };

  mongoose.model('Person', PersonSchema);
};
