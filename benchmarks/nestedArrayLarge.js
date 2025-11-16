'use strict';

const mongoose = require('../');

run().catch(err => {
    console.error(err);
    process.exit(-1);
});

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_benchmark');

    const bookSchema = new mongoose.Schema({
        ticker: String,
        asks: [[Number]],
        bids: [[Number]],
        timestamp: String,
    });

    const Book = mongoose.model('BookNestedArray', bookSchema);

    const doc = { asks: [], bids: [] };
    for (let i = 0; i < 10000; ++i) {
        doc.asks.push([i]);
        doc.bids.push([i]);
    }

    if (!process.env.MONGOOSE_BENCHMARK_SKIP_SETUP) {
        await Book.deleteMany({});
    }

    const constructStart = Date.now();
    for (let i = 0; i < 100; ++i) {
        new Book(doc);
    }
    const constructEnd = Date.now();

    const inst = new Book(doc);
    const saveStart = Date.now();
    await inst.save();
    const saveEnd = Date.now();

    const results = {
        'document construction (100x) ms': +(constructEnd - constructStart).toFixed(2),
        'save() time ms': +(saveEnd - saveStart).toFixed(2)
    };

    console.log(JSON.stringify(results, null, '  '));
    process.exit(0);
}
