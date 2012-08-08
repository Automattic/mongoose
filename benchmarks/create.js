//require('nodetime').profile();

var mongoose = require('../../mongoose')
var fs = require('fs')

var Schema = mongoose.Schema;

CheckItem = new Schema({
  name: { type: String },
  type: { type: String },
  pos: { type: Number },
});

Checklist = new Schema({
  name: { type: String },
  checkItems: { type: [CheckItem] }
});

Board = new Schema({
  checklists: { type: [Checklist] }
});

var start1 = new Date();
var Board = mongoose.model('Board', Board);
//var Cl = mongoose.model('Checklist', Checklist);
var doc = JSON.parse(fs.readFileSync(__dirname + '/bigboard.json'));
var time1 = (new Date - start1);
console.error('reading from disk and parsing JSON took %d ms', time1);

var start2 = new Date();
for (var i = 0; i < 100; ++i) {
  var board = new Board(doc);
}
var time2 = (new Date - start2);
console.error('instantiating schema object took %d ms', time2);
