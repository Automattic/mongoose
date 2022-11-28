'use strict';

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

    try {
      modifiedPaths(objA, 'path', null);
    } catch (e) {
      console.log(e);
    }
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

    try {
      // miss an `await` before `Test2Model.countDocuments()`
      await Test1Model.updateOne({ n: 'x' }, { v: Test2Model.countDocuments() }, { upsert: true });
    } catch (e) {
      console.log(e);
    }
  });
});
