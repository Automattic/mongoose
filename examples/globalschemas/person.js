// import the necessary modules
var mongoose = require('../../lib');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
  // define schema
  var PersonSchema = new Schema({
    name: String,
    age: Number,
    birthday: Date
  });
  mongoose.model('Person', PersonSchema);
};
