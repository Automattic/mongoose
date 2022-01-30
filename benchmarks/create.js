// require('nodetime').profile();

'use strict';

const mongoose = require('../../mongoose');
const Benchmark = require('benchmark');

const Schema = mongoose.Schema;

let CheckItem = new Schema({
  name: { type: String },
  type: { type: String },
  pos: { type: Number }
});

const Checklist = new Schema({
  name: { type: String },
  checkItems: { type: [CheckItem] }
});

let Board = new Schema({
  checklists: { type: [Checklist] }
});

// const start1 = new Date();
const BoardModel = mongoose.model('Board', Board);
const CheckItemModel = mongoose.model('CheckItem', CheckItem);
// const Cl = mongoose.model('Checklist', Checklist);
const doc = require('./bigboard.json');
// const time1 = (new Date - start1);
// console.error('reading from disk and parsing JSON took %d ms', time1);

new Benchmark.Suite()
  .add('CheckItem', function () {
    const test = new CheckItemModel({
      "_id": "4daee8a2aae47fe55305eabf",
      "pos": 32768,
      "type": "check",
      "name": "delete checklists"
  });
  })
  .add('Board', function () {
    const test = new BoardModel(doc);
  })
  .on('cycle', function (evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .run();
