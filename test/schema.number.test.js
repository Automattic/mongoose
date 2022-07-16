'use strict';

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
});
