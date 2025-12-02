'use strict';

const start = require('./common');
const mongoose = start.mongoose;
const assert = require('assert');
const ObjectParameterError = require('../lib/error/objectParameter');

describe('gh-15812', function () {
    it('should throw ObjectParameterError when init is called with null', function () {
        const doc = new mongoose.Document({}, new mongoose.Schema({ name: String }));
        try {
            doc.init(null);
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error instanceof ObjectParameterError);
            assert.strictEqual(error.name, 'ObjectParameterError');
            assert.ok(error.message.includes('Parameter "doc" to init() must be an object'));
        }
    });

    it('should throw ObjectParameterError when init is called with undefined', function () {
        const doc = new mongoose.Document({}, new mongoose.Schema({ name: String }));
        try {
            doc.init(undefined);
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error instanceof ObjectParameterError);
            assert.strictEqual(error.name, 'ObjectParameterError');
            assert.ok(error.message.includes('Parameter "doc" to init() must be an object'));
        }
    });
});
