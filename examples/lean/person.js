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
    birthday: Date,
    gender: String,
    likes: [String]
  });
  mongoose.model('Person', PersonSchema);
};
