/**
 * Module dependencies.
 */

var Schema = require('../lib/schema');
var assert = require('assert');
var cast = require('../lib/cast');

describe('cast: ', function() {
  describe('bitwise query operators: ', function() {
    it('with a number', function() {
      var schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllClear: 3 } }),
        { x: { $bitsAllClear: 3 } });
    });

    it('with an array', function() {
      var schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllSet: [2, '3'] } }),
        { x: { $bitsAllSet: [2, 3] } });
    });

    it('with a buffer', function() {
      var schema = new Schema({ x: Number });
      assert.deepEqual(cast(schema, { x: { $bitsAnyClear: new Buffer([3]) } }),
        { x: { $bitsAnyClear: new Buffer([3]) } });
    });

    it('throws when invalid', function() {
      var schema = new Schema({ x: Number });
      assert.throws(function() {
        cast(schema, { x: { $bitsAnySet: 'Not a number' } });
      }, /Cast to number failed/);
    });
  });
});
