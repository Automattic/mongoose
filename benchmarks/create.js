//require('nodetime').profile();

var mongoose = require('../../mongoose')
, fs = require('fs');

var Schema = mongoose.Schema;

var CheckItem = new Schema({
  name: { type: String }
, type: { type: String }
, pos: { type: Number }
});

var Checklist = new Schema({
  name: { type: String }
, checkItems: { type: [CheckItem] }
});

var Board = new Schema({
  checklists: { type: [Checklist] }
});

Board = mongoose.model('Board', Board);
var doc = JSON.parse(fs.readFileSync(__dirname + '/bigboard.json'));

var start = new Date();
for (var i = 0; i < 1000; ++i) {
  new Board(doc);
}
var elapsed = (new Date - start);
console.error('creation of large object took %d ms', elapsed);
