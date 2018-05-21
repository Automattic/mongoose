var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema;

/**
 * Test.
 */

describe('SchemaDate', function() {
  var M;

  before(function() {
    var schema = new Schema({ x: Date });
    M = mongoose.model('Model', schema);
  });

  it('accepts a Date', function() {
    var doc = new M({ x: new Date('2017-01-01') });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.getUTCFullYear(), 2017);
  });

  it('casts a date string to a string', function() {
    var doc = new M({ x: '2017-10-01' });
    assert.ok(doc.x instanceof Date);
  });

  it('interprets a number as a unix timestamp', function() {
    var doc = new M({ x: 2017 });
    assert.equal(doc.x.getUTCFullYear(), 1970);
  });

  it('attempts to interpret a string as a Date, not a timestamo (gh-5395)', function() {
    var doc = new M({ x: '2017' });
    assert.equal(doc.x.getUTCFullYear(), 2017);
  });

  it('casts any object with a `.valueOf` function to a date', function() {
    var mockDate = Date.now();
    var doc = new M({ x: { valueOf: function() { return mockDate; } } });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.valueOf(), mockDate);
  });

  it('casts string representation of unix timestamps (gh-6443)', function() {
    var timestamp = Date.now();
    var stringTimestamp = timestamp.toString();
    var doc = new M({ x: stringTimestamp });
    assert.ok(doc.x instanceof Date);
    assert.equal(doc.x.getTime(), timestamp);
  });
});
