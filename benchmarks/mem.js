'use strict';

const mongoose = require('../');

const Schema = mongoose.Schema;

mongoose.connect('mongodb://127.0.0.1/mongoose-bench');

const DocSchema = new Schema({
  title: String
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

const methods = [];
methods.push(function(a, cb) {
  A.findOne({ _id: a._id }, cb);
}); // 2 MB
methods.push(function(a, cb) {
  A.find({ _id: a._id, bool: a.bool }, cb);
}); // 3.8 MB
methods.push(function(a, cb) {
  A.findById(a._id, cb);
}); // 4.6 MB
methods.push(function(a, cb) {
  A.where('number', a.number).limit(10).exec(cb);
}); // 4.8 MB
methods.push(function(a, cb) {
  A.where('date', a.date).select('string').limit(10).exec(cb);
}); // 3.5 mb
methods.push(function(a, cb) {
  A.where('date', a.date).select('string bool').limit(10).exec(cb);
}); // 3.5 MB
methods.push(function(a, cb) {
  A.where('date', a.date).where('array').in(3).limit(10).exec(cb);
}); // 1.82 MB
methods.push(function(a, cb) {
  A.updateOne({ _id: a._id }, { $addToset: { array: 'heeeeello' } }, cb);
}); // 3.32 MB
methods.push(function(a, cb) {
  A.deleteOne({ _id: a._id }, cb);
}); // 3.32 MB
methods.push(function(a, cb) {
  A.find().where('objectids').exists().select('dates').limit(10).exec(cb);
}); // 3.32 MB
methods.push(function(a, cb) {
  A.count({ strings: a.strings[2], number: a.number }, cb);
}); // 3.32 MB
methods.push(function(a, cb) {
  a.string = 'asdfaf';
  a.number = 38383838;
  a.date = new Date;
  a.bool = false;
  a.array.push(3);
  a.dates.push(new Date);
  // a.bools.push([true, false]);
  a.docs.addToSet({ title: 'woot' });
  a.strings.remove('three');
  a.numbers.pull(72);
  a.objectids.$pop();
  a.docs.pull.apply(a.docs, a.docs);
  a.s.nest = 'aooooooga';

  if (i % 2) {
    a.toObject({ depopulate: true });
  } else {
    if (a._delta) {
      a._delta();
    } else {
      a.$__delta();
    }
  }

  cb();
});

const started = process.memoryUsage();
const start = new Date;
const total = 10000;
let i = total;

function done() {
  const time = (new Date - start);
  const used = process.memoryUsage();

  const res = {};
  res.rss = used.rss - started.rss;
  res.heapTotal = used.heapTotal - started.heapTotal;
  res.heapUsed = used.heapUsed - started.heapUsed;

  console.error('took %d ms for %d docs (%d dps)', time, total, total / (time / 1000), 'change: ', res);

  mongoose.connection.db.dropDatabase(function() {
    mongoose.connection.close();
  });
}

function cycle() {
  if (i-- === 0) {
    return done();
  }
  let a = new A({
    string: 'hello world',
    number: 444848484,
    date: new Date,
    bool: true,
    buffer: Buffer.alloc(0),
    objectid: new mongoose.Types.ObjectId(),
    array: [4, {}, [], 'asdfa'],
    strings: ['one', 'two', 'three', 'four'],
    numbers: [72, 6493, 83984643, 348282.55],
    dates: [new Date, new Date, new Date],
    bools: [true, false, false, true, true],
    buffers: [Buffer.from([33]), Buffer.from([12])],
    objectids: [new mongoose.Types.ObjectId],
    docs: [{ title: 'yo' }, { title: 'nowafasdi0fas asjkdfla fa' }]
  });

  a.save(function() {
    methods[Math.random() * methods.length | 0](a, function() {
      a = null;
      process.nextTick(cycle);
    });
  });

  /* if (i%2)
    a.toObject({ depopulate: true });
  else
    a._delta();

  if (!(i%50)) {
    var u = process.memoryUsage();
    console.error('rss: %d, vsize: %d, heapTotal: %d, heapUsed: %d',
        u.rss, u.vsize, u.heapTotal, u.heapUsed);
  } */
}

mongoose.connection.on('open', function() {
  mongoose.connection.db.dropDatabase(function() {
    cycle();
    // --trace-opt --trace-deopt --trace-bailout
  });
});
