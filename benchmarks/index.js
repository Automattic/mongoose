Error.stackTraceLimit = Infinity;
var out = process.argv.length < 3;
function log() {
  if (out) {
    console.error.apply(console, arguments);
  }
}

var mongoose = require('../'),
    Schema = mongoose.Schema;

var DocSchema = new Schema({
  title: String
});

var AllSchema = new Schema({
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

var A = mongoose.model('A', AllSchema);

var numdocs = 0;
var totaltime = 0;

// bench the normal way
// the try building the doc into the document prototype
// and using inheritance and bench that
//
// also, bench using listeners for each subdoc vs one
// listener that knows about all subdocs and notifies
// them.

function run(label, fn) {
  log('running %s', label);
  var started = process.memoryUsage();
  var start = new Date;
  var total = 10000;
  var i = total;
  var a;
  while (i--) {
    a = fn();
    if (i % 2) {
      a.toObject({depopulate: true});
    } else {
      if (a._delta) {
        a._delta();
      } else {
        a.$__delta();
      }
    }
  }
  var time = (new Date - start) / 1000;
  totaltime += time;
  numdocs += total;
  log(label + ' took %d seconds for %d docs (%d dps)', time, total, total / time);
  var used = process.memoryUsage();
  var res = {};
  res.rss = used.rss - started.rss;
  res.heapTotal = used.heapTotal - started.heapTotal;
  res.heapUsed = used.heapUsed - started.heapUsed;
  log('change: ', res);
  a = res = used = time = started = start = total = i = null;
  // console.error(((used.vsize - started.vsize) / 1048576)+' MB');
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
    buffer: new Buffer(0)
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
    buffers: [new Buffer([33]), new Buffer([12])]
  });
});
run('array of objectids', function() {
  return new A({
    objectids: [new mongoose.Types.ObjectId]
  });
});
run('array of docs', function() {
  return new A({
    docs: [{title: 'yo'}, {title: 'nowafasdi0fas asjkdfla fa'}]
  });
});

// console.error(a.toObject({depopulate:true}));
console.error('completed %d docs in %d seconds (%d dps)', numdocs, totaltime, numdocs / totaltime);

// --trace-opt --trace-deopt --trace-bailout
