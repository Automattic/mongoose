'use strict';

const assert = require('assert');
const start = require('../common');

const modifiedPaths = require('../../lib/helpers/common').modifiedPaths;
const mongoose = start.mongoose;
const { Schema } = mongoose;


describe('modifiedPaths, bad update value which has circular reference field', () => {

  it('update value can be null', function() {
    modifiedPaths(null, 'path', null);
  });

  it('values with obvious error', function() {
    const objA = {};
    objA.a = objA;

    assert.throws(() => modifiedPaths(objA, 'path', null), /circular reference/);
  });

  it('original error i made', async function() {
    await mongoose.connect(start.uri);

    const test1Schema = new Schema({
      v: Number,
      n: String
    });

    const Test1Model = mongoose.model('Test1', test1Schema);

    const test2Schema = new Schema({
      v: Number
    });

    const Test2Model = mongoose.model('Test2', test2Schema);

    for (let i = 0; i < 5; i++) {
      const doc = new Test2Model({ v: i });
      await doc.save();
    }
    
    assert.rejects(() => Test1Model.updateOne({ n: 'x' }, { v: Test2Model.countDocuments() }, { upsert: true }), /circular reference/);
  });
});
