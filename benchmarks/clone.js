'use strict';

const mongoose = require('../');
const Schema = mongoose.Schema;
const Benchmark = require('benchmark');

const DocSchema = new Schema({
  title: String
});

const SimpleSchema = new Schema({
  string: { type: String, required: true },
  number: { type: Number, min: 10 }
});

const AllSchema = new Schema({
  string: { type: String, required: true },
  number: { type: Number, min: 10 },
  date: Date,
  bool: Boolean,
  buffer: Buffer,
  objectid: Schema.ObjectId,
  array: Array,
  strings: [String],
  numbers: [Number],
  dates: [Date],
  bools: [Boolean],
  buffers: [Buffer],
  objectids: [Schema.ObjectId],
  docs: {
    type: [DocSchema], validate: function() {
      return true;
    }
  },
  s: { nest: String }
});

const A = mongoose.model('A', AllSchema);
const a = new A({
  string: 'hello world',
  number: 444848484,
  date: new Date(),
  bool: true,
  buffer: Buffer.alloc(0),
  objectid: new mongoose.Types.ObjectId(),
  array: [4, {}, [], 'asdfa'],
  strings: ['one', 'two', 'three', 'four'],
  numbers: [72, 6493, 83984643, 348282.55],
  dates: [new Date(), new Date(), new Date()],
  bools: [true, false, false, true, true],
  buffers: [Buffer.from([33]), Buffer.from([12])],

  objectids: [new mongoose.Types.ObjectId()],
  docs: [{ title: 'yo' }, { title: 'nowafasdi0fas asjkdfla fa' }],
  s: { nest: 'hello there everyone!' }
});

const Simple = mongoose.model('Simple', SimpleSchema);
const simple = new Simple({
  string: 'hello world',
  number: 444848484
});

new Benchmark.Suite()
  .add('Simple', function() {
    simple.toObject({ depopulate: true });
  })
  .add('AllSchema', function() {
    a.toObject({ depopulate: true });
  })
  .on('cycle', function(evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .run();
process.memoryUsage();

// --trace-opt --trace-deopt --trace-bailout