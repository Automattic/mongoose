'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('gh-15803', function () {
    let db;

    before(async function () {
        db = await start();
    });

    after(async function () {
        await db.close();
    });

    it('autoIndex should default to false', async function () {
        const testSchema = new Schema({ name: { type: String, index: true } });
        const Test = db.model('Test', testSchema);

        await Test.init();

        const indexes = await Test.collection.listIndexes().toArray();
        const indexNames = indexes.map(idx => idx.name);

        assert.ok(indexNames.includes('_id_'));
        assert.ok(!indexNames.includes('name_1'));
    });
});
