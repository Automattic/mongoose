'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('gh-paths-to-save', function () {
    let db;
    let Model;

    before(function () {
        db = start();
    });

    after(async function () {
        await db.close();
    });

    beforeEach(() => db.deleteModel(/.*/));
    afterEach(() => db.deleteModel(/.*/));
    afterEach(() => db.dropDatabase());

    it('should allow saving parent paths of whitelisted paths (gh-issue)', async function () {
        const schema = new Schema({
            nested: {
                a: Number,
                b: Number
            }
        });

        Model = db.model('Test', schema);

        const doc = new Model({ nested: { a: 1, b: 1 } });
        await doc.save();

        // Modify the parent path
        doc.nested = { a: 2, b: 2 };

        // Try to save ONLY nested.a
        // This should allow the update to nested.a to go through, even if it means saving the whole nested object
        await doc.save({ pathsToSave: ['nested.a'] });

        const found = await Model.findById(doc._id);
        assert.strictEqual(found.nested.a, 2);
        assert.strictEqual(found.nested.b, 2);
    });
});
