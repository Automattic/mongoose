/**
 * Module dependencies.
 */

var Schema = require('../lib/schema');
var assert = require('power-assert');
var cast = require('../lib/cast');
var ObjectId = require('bson').ObjectId;

describe('cast: ', function() {
  describe('when casting an array', function() {
    it('casts array with ObjectIds to $in query', function(done) {
      var schema = new Schema({x: Schema.Types.ObjectId});
      var ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, {x: ids}), { x: { $in: ids } });
      done();
    });

    it('casts array with ObjectIds to $in query when values are strings', function(done) {
      var schema = new Schema({x: Schema.Types.ObjectId});
      var ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, {x: ids.map(String)}), { x: { $in: ids } });
      done();
    });

    it('throws when ObjectIds not valid', function(done) {
      var schema = new Schema({x: Schema.Types.ObjectId});
      var ids = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, {x: ids});
      }, /Cast to ObjectId failed/);
      done();
    });

    it('casts array with Strings to $in query', function(done) {
      var schema = new Schema({x: String});
      var strings = ['bleep', 'bloop'];
      assert.deepEqual(cast(schema, {x: strings}), { x: { $in: strings } });
      done();
    });

    it('casts array with Strings when necessary', function(done) {
      var schema = new Schema({x: String});
      var strings = [123, 456];
      assert.deepEqual(cast(schema, {x: strings}), { x: { $in: strings.map(String) } });
      done();
    });

    it('casts array with Numbers to $in query', function(done) {
      var schema = new Schema({x: Number});
      var numbers = [42, 25];
      assert.deepEqual(cast(schema, {x: numbers}), { x: { $in: numbers } });
      done();
    });

    it('casts array with Numbers to $in query when values are strings', function(done) {
      var schema = new Schema({x: Number});
      var numbers = ['42', '25'];
      assert.deepEqual(cast(schema, {x: numbers}), { x: { $in: numbers.map(Number) } });
      done();
    });

    it('throws when Numbers are not valid', function(done) {
      var schema = new Schema({x: Number});
      var numbers = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, {x: numbers});
      }, /Cast to number failed for value "asfds"/);
      done();
    });
  });

  describe('bitwise query operators: ', function() {
    it('with a number', function(done) {
      var schema = new Schema({x: Buffer});
      assert.deepEqual(cast(schema, {x: {$bitsAllClear: 3}}),
          {x: {$bitsAllClear: 3}});
      done();
    });

    it('with an array', function(done) {
      var schema = new Schema({x: Buffer});
      assert.deepEqual(cast(schema, {x: {$bitsAllSet: [2, '3']}}),
          {x: {$bitsAllSet: [2, 3]}});
      done();
    });

    it('with a buffer', function(done) {
      var schema = new Schema({x: Number});
      assert.deepEqual(cast(schema, {x: {$bitsAnyClear: new Buffer([3])}}),
          {x: {$bitsAnyClear: new Buffer([3])}});
      done();
    });

    it('throws when invalid', function(done) {
      var schema = new Schema({x: Number});
      assert.throws(function() {
        cast(schema, {x: {$bitsAnySet: 'Not a number'}});
      }, /Cast to number failed/);
      done();
    });
  });
});
