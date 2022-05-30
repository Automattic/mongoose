'use strict';

Error.stackTraceLimit = Infinity;
const out = process.argv.length < 3;
function log() {
  if (out) {
    console.error.apply(console, arguments);
  }
}

const mongoose = require('../');
const Schema = mongoose.Schema;

const DocSchema = new Schema({
  title: String
});

const AllSchema = new Schema({
  string: String,
  number: Number,
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
  docs: [DocSchema]
});

const A = mongoose.model('A', AllSchema);

let numdocs = 0;
let totaltime = 0;

// bench the normal way
// the try building the doc into the document prototype
// and using inheritance and bench that
//
// also, bench using listeners for each subdoc vs one
// listener that knows about all subdocs and notifies
// them.

function run(label, fn) {
  log('running %s', label);
  let started = process.memoryUsage();
  let start = new Date;
  let total = 10000;
  let i = total;
  let a;
  while (i--) {
    a = fn();
    if (i % 2) {
      a.toObject({ depopulate: true });
    } else {
      if (a._delta) {
        a._delta();
      } else {
        a.$__delta();
      }
    }
  }
  let time = (new Date - start) / 1000;
  totaltime += time;
  numdocs += total;
  log(label + ' took %d seconds for %d docs (%d dps)', time, total, total / time);
  let used = process.memoryUsage();
  let res = {};
  res.rss = used.rss - started.rss;
  res.heapTotal = used.heapTotal - started.heapTotal;
  res.heapUsed = used.heapUsed - started.heapUsed;
  log('change: ', res);
  a = res = used = time = started = start = total = i = null;
}

run('string', function() {
  return new A({
    string: 'hello world'
  });
});
run('number', function() {
  return new A({
    number: 444848484
  });
});
run('date', function() {
  return new A({
    date: new Date
  });
});
run('bool', function() {
  return new A({
    bool: true
  });
});
run('buffer', function() {
  return new A({
    buffer: Buffer.alloc(0)
  });
});
run('objectid', function() {
  return new A({
    objectid: new mongoose.Types.ObjectId()
  });
});
run('array of mixed', function() {
  return new A({
    array: [4, {}, [], 'asdfa']
  });
});
run('array of strings', function() {
  return new A({
    strings: ['one', 'two', 'three', 'four']
  });
});
run('array of numbers', function() {
  return new A({
    numbers: [72, 6493, 83984643, 348282.55]
  });
});
run('array of dates', function() {
  return new A({
    dates: [new Date, new Date, new Date]
  });
});
run('array of bools', function() {
  return new A({
    bools: [true, false, false, true, true]
  });
});
run('array of buffers', function() {
  return new A({
    buffers: [Buffer.from([33]), Buffer.from([12])]
  });
});
run('array of objectids', function() {
  return new A({
    objectids: [new mongoose.Types.ObjectId]
  });
});
run('array of docs', function() {
  return new A({
    docs: [{ title: 'yo' }, { title: 'nowafasdi0fas asjkdfla fa' }]
  });
});

console.error('completed %d docs in %d seconds (%d dps)', numdocs, totaltime, numdocs / totaltime);