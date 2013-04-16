
// modules
var mongoose = require('mongoose')
var Schema = mongoose.Schema;

// parse json
var raw = require('./schema.json');

// create a schema
var timeSignatureSchema = Schema(raw);

// compile the model
var TimeSignature = mongoose.model('TimeSignatures', timeSignatureSchema);

// create a TimeSignature document
var threeFour = new TimeSignature({
    count: 3
  , unit: 4
  , description: "3/4"
  , additive: false
  , created: new Date
  , links: ["http://en.wikipedia.org/wiki/Time_signature"]
});

// print its description
console.log(threeFour)
