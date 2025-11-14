'use strict';

const mongoose = require('../');
const Benchmark = require('benchmark');

const { Schema } = mongoose;

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');

    const bookSchema = new Schema({
        ticker: String,
        asks: [[Number]],
        bids: [[Number]],
        timestamp: String,
    });

    const Book = mongoose.model('BookNestedArray', bookSchema);

    let doc = { asks: [], bids: [] };
    for (let i = 0; i < 10000; ++i) {
        doc.asks.push([i]);
        doc.bids.push([i]);
    }

    const suite = new Benchmark.Suite();

    suite
        .add('BookNestedArray document construction', function () {
        new Book(doc);
        })
        .on('cycle', function(evt) {
        if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
            console.log(String(evt.target));
        }
        })
        .run();

    await mongoose.disconnect();
}
