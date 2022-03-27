// require('nodetime').profile();

'use strict';

const mongoose = require('../../mongoose');
const Benchmark = require('benchmark');

const Schema = mongoose.Schema;

const CheckItem = new Schema({
  name: { type: String },
  type: { type: String },
  pos: { type: Number }
});

const Checklist = new Schema({
  name: { type: String },
  checkItems: { type: [CheckItem] }
});

const Board = new Schema({
  checklists: { type: [Checklist] }
});

const BoardModel = mongoose.model('Board', Board);
const CheckItemModel = mongoose.model('CheckItem', CheckItem);
const doc = require('./bigboard.json');

new Benchmark.Suite()
  .add('CheckItem', function() {
    new CheckItemModel({
      _id: '4daee8a2aae47fe55305eabf',
      pos: 32768,
      type: 'check',
      name: 'delete checklists'
    });
  })
  .add('Board', function() {
    new BoardModel(doc);
  })
  .on('cycle', function(evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .run();
