// require('nodetime').profile();

var mongoose = require('../../mongoose');
var fs = require('fs');

var Schema = mongoose.Schema;

var CheckItem = new Schema({
  name: {type: String},
  type: {type: String},
  pos: {type: Number}
});

var Checklist = new Schema({
  name: {type: String},
  checkItems: {type: [CheckItem]}
});

var Board = new Schema({
  checklists: {type: [Checklist]}
});

// var start1 = new Date();
Board = mongoose.model('Board', Board);
// var Cl = mongoose.model('Checklist', Checklist);
var doc = JSON.parse(fs.readFileSync(__dirname + '/bigboard.json'));
// var time1 = (new Date - start1);
// console.error('reading from disk and parsing JSON took %d ms', time1);

var start2 = new Date();
for (var i = 0; i < 1000; ++i) {
  new Board(doc);
}
var time2 = (new Date - start2);
console.error('creation of large object took %d ms', time2);
