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
    likes: [String],
    // define the geospatial field
    loc: { type: [Number], index: '2d' }
  });

  // define a method to find the closest person
  PersonSchema.methods.findClosest = function(cb) {
    return mongoose.model('Person').find({
      loc: { $nearSphere: this.loc },
      name: { $ne: this.name }
    }).limit(1).exec(cb);
  };

  mongoose.model('Person', PersonSchema);
};
