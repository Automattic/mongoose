
// import the necessary modules
var mongoose = require('../../lib');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
  // define schema
  var PersonSchema = new Schema({
    name : String,
    age : Number,
    birthday : Date
  });

  // define a static
  PersonSchema.statics.findPersonByName = function(name, cb) {
    this.find({ name : new RegExp(name, 'i') }, cb);
  };

  mongoose.model('Person', PersonSchema);
};
