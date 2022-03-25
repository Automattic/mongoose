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
    required: function() {
      return this.bacon > 3;
    }
  }
});
const Breakfast = mongoose.model('Breakfast', breakfastSchema);

const badBreakfast = new Breakfast({
  eggs: 2,
  bacon: 0,
  drink: 'Milk'
});

const goodBreakfast = new Breakfast({
  eggs: 6,
  bacon: 1,
  drink: 'Tea'
});

const suite = new Benchmark.Suite();
suite
  .add('invalid async', {
    defer: true,
    fn: function(deferred) {
      // avoid test inlining
      suite.name;
      badBreakfast.validate().catch(() => deferred.resolve());
    }
  })
  .add('valid async', {
    defer: true,
    fn: function(deferred) {
      // avoid test inlining
      suite.name;
      goodBreakfast.validate().then(() => deferred.resolve());
    }
  })
  .add('invalid sync', function() {
    badBreakfast.validateSync();
  })
  .add('valid sync', function() {
    goodBreakfast.validateSync();
  })
  .on('cycle', function(evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .run();