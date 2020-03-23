'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('SchemaDate', function() {
  let M;

  before(function() {
    const schema = new Schema({ x: Date });
    mongoose.deleteModel(/Test/);
    M = mongoose.model('Test', schema);
  });

  it('accepts a Date', function() {
    const doc = new M({ x: new Date('2017-01-01') });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.getUTCFullYear(), 2017);
  });

  it('casts a date string to a string', function() {
    const doc = new M({ x: '2017-10-01' });
    assert.ok(doc.x instanceof Date);
  });

  it('interprets a number as a unix timestamp', function() {
    const doc = new M({ x: 2017 });
    assert.equal(doc.x.getUTCFullYear(), 1970);
  });

  it('attempts to interpret a string as a Date, not a timestamo (gh-5395)', function() {
    const doc = new M({ x: '2017' });
    assert.equal(doc.x.getUTCFullYear(), 2017);
  });

  it('casts any object with a `.valueOf` function to a date', function() {
    const mockDate = Date.now();
    const doc = new M({ x: { valueOf: function() { return mockDate; } } });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.valueOf(), mockDate);
  });

  it('casts string representation of unix timestamps (gh-6443)', function() {
    const timestamp = Date.now();
    const stringTimestamp = timestamp.toString();
    const doc = new M({ x: stringTimestamp });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.getTime(), timestamp);
  });
});
