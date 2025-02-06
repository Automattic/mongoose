'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('SchemaNumber', function() {
  it('allows 0 with required: true and ref set (gh-11912)', async function() {
    const schema = new Schema({ x: { type: Number, required: true, ref: 'Foo' } });

    await new Promise((resolve, reject) => {
      schema.path('x').doValidate(0, err => {
        if (err != null) {
          return reject(err);
        }
        resolve();
      });
    });
  });

  it('allows calling `min()` with no message arg (gh-15236)', async function() {
    const schema = new Schema({ x: { type: Number } });
    schema.path('x').min(0);

    const err = await new Promise((resolve) => {
      schema.path('x').doValidate(-1, err => {
        resolve(err);
      });
    });
    assert.ok(err);
    assert.equal(err.message, 'Path `x` (-1) is less than minimum allowed value (0).');

    schema.path('x').min(0, 'Invalid value!');

    const err2 = await new Promise((resolve) => {
      schema.path('x').doValidate(-1, err => {
        resolve(err);
      });
    });
    assert.equal(err2.message, 'Invalid value!');
  });
});
