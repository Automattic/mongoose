// require('nodetime').profile();

'use strict';

const mongoose = require('../../mongoose');
const Benchmark = require('benchmark');

const Schema = mongoose.Schema;
const breakfastSchema = new Schema({
  eggs: {
    type: Number,
    min: [6, 'Too few eggs'],
    max: 12
  },
  bacon: {
    type: Number,
    required: [true, 'Why no bacon?']
  },
  drink: {
    type: String,
    enum: ['Coffee', 'Tea'],
    required: function () {
      return this.bacon > 3;
    }
  }
});
const Breakfast = mongoose.model('Breakfast', breakfastSchema);
// const time1 = (new Date - start1);
// console.error('reading from disk and parsing JSON took %d ms', time1);
const badBreakfast = new Breakfast({
  eggs: 2,
  bacon: 0,
  drink: 'Milk'
});

const goodBreakfast = new Breakfast({
  eggs: 6,
  bacon: 1,
  drink: 'Tea'
})
// const start = new Date;
// const total = 10000000;
// let i = total;
// let len;

// for (i = 0, len = total; i < len; ++i) {

// const goodBreakfast = new Breakfast({
//   eggs: 6,
//   bacon: 1,
//   drink: 'Tea'
// })
//       goodBreakfast.validateSync();
// }

// const time = (new Date - start) / 1000;
// console.error('took %d seconds for %d docs (%d dps)', time, total, total / time);
new Benchmark.Suite()
.add('invalid', function () {
  badBreakfast.validateSync();
})
.add('valid', function () {
  goodBreakfast.validateSync();
})
  .on('cycle', function (evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .run();