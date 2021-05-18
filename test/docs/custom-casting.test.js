'use strict';

const assert = require('assert');
const Mongoose = require('../../lib');

const mongoose = new Mongoose.Mongoose();

describe('custom casting', function() {
  let originalCast;

  beforeEach(function() {
    originalCast = mongoose.Number.cast();
  });

  afterEach(function() {
    mongoose.deleteModel('Test');
    mongoose.Number.cast(originalCast);
  });

  it('casting error', function() {
    const schema = new mongoose.Schema({
      age: Number
    });
    const Model = mongoose.model('Test', schema);

    const doc = new Model({ age: '二' });
    const err = doc.validateSync();
    // "Cast to Number failed for value "二" at path "age""
    err.message;
    // acquit:ignore:start
    assert.ok(err.message.indexOf('Cast to Number failed for value "二" (type string) at path "age"') !== -1, err.message);
    // acquit:ignore:end
  });

  it('casting override', function() {
    // Calling `cast()` on a class that inherits from `SchemaType` returns the
    // current casting function.
    const originalCast = mongoose.Number.cast();

    // Calling `cast()` with a function sets the current function used to
    // cast a given schema type, in this cast Numbers.
    mongoose.Number.cast(v => {
      if (v === '二') {
        return 2;
      }
      return originalCast(v);
    });

    const schema = new mongoose.Schema({
      age: Number
    });

    const Model = mongoose.model('Test', schema);

    const doc = new Model({ age: '二' });
    const err = doc.validateSync();
    err; // null
    doc.age; // 2
    // acquit:ignore:start
    assert.ifError(err);
    assert.equal(doc.age, 2);
    // acquit:ignore:end
  });
});
