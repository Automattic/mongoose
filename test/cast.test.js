/**
 * Module dependencies.
 */

'use strict';

require('./common');

const Schema = require('../lib/schema');
const assert = require('assert');
const cast = require('../lib/cast');
const ObjectId = require('bson').ObjectId;
const Buffer = require('safe-buffer').Buffer;

describe('cast: ', function() {
  describe('when casting an array', function() {
    it('casts array with ObjectIds to $in query', function(done) {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, { x: ids }), { x: { $in: ids } });
      done();
    });

    it('casts array with ObjectIds to $in query when values are strings', function(done) {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, { x: ids.map(String) }), { x: { $in: ids } });
      done();
    });

    it('throws when ObjectIds not valid', function(done) {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, { x: ids });
      }, /Cast to ObjectId failed/);
      done();
    });

    it('casts array with Strings to $in query', function(done) {
      const schema = new Schema({ x: String });
      const strings = ['bleep', 'bloop'];
      assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings } });
      done();
    });

    it('casts array with Strings when necessary', function(done) {
      const schema = new Schema({ x: String });
      const strings = [123, 456];
      assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings.map(String) } });
      done();
    });

    it('casts array with Numbers to $in query', function(done) {
      const schema = new Schema({ x: Number });
      const numbers = [42, 25];
      assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers } });
      done();
    });

    it('casts $in and $nin with empty array (gh-5913) (gh-7806)', function(done) {
      const schema = new Schema({
        v: Number,
        arr: [Number]
      });
      assert.deepEqual(cast(schema, { v: { $in: [1, []] } }),
        { v: { $in: [1, []] } });
      assert.deepEqual(cast(schema, { arr: { $in: [1, []] } }),
        { arr: { $in: [1, []] } });

      assert.deepEqual(cast(schema, { v: { $nin: [1, []] } }),
        { v: { $nin: [1, []] } });
      assert.deepEqual(cast(schema, { arr: { $nin: [1, []] } }),
        { arr: { $nin: [1, []] } });

      done();
    });

    it('casts array with Numbers to $in query when values are strings', function(done) {
      const schema = new Schema({ x: Number });
      const numbers = ['42', '25'];
      assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers.map(Number) } });
      done();
    });

    it('throws when Numbers are not valid', function(done) {
      const schema = new Schema({ x: Number });
      const numbers = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, { x: numbers });
      }, /Cast to number failed for value "asfds"/);
      done();
    });
  });

  describe('bitwise query operators: ', function() {
    it('with a number', function(done) {
      const schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllClear: 3 } }),
        { x: { $bitsAllClear: 3 } });
      done();
    });

    it('with an array', function(done) {
      const schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllSet: [2, '3'] } }),
        { x: { $bitsAllSet: [2, 3] } });
      done();
    });

    it('with a buffer', function(done) {
      const schema = new Schema({ x: Number });
      assert.deepEqual(cast(schema, { x: { $bitsAnyClear: Buffer.from([3]) } }),
        { x: { $bitsAnyClear: Buffer.from([3]) } });
      done();
    });

    it('throws when invalid', function(done) {
      const schema = new Schema({ x: Number });
      assert.throws(function() {
        cast(schema, { x: { $bitsAnySet: 'Not a number' } });
      }, /Cast to number failed/);
      done();
    });
  });
});
