/**
 * Module dependencies.
 */

'use strict';

require('./common');

const Schema = require('../lib/schema');
const assert = require('assert');
const cast = require('../lib/cast');
const ObjectId = require('bson').ObjectId;

describe('cast: ', function() {
  describe('when casting an array', function() {
    it('casts array with ObjectIds to $in query', function() {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, { x: ids }), { x: { $in: ids } });
    });

    it('casts array with ObjectIds to $in query when values are strings', function() {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [new ObjectId(), new ObjectId()];
      assert.deepEqual(cast(schema, { x: ids.map(String) }), { x: { $in: ids } });
    });

    it('throws when ObjectIds not valid', function() {
      const schema = new Schema({ x: Schema.Types.ObjectId });
      const ids = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, { x: ids });
      }, /Cast to ObjectId failed/);
    });

    it('casts array with Strings to $in query', function() {
      const schema = new Schema({ x: String });
      const strings = ['bleep', 'bloop'];
      assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings } });
    });

    it('casts array with Strings when necessary', function() {
      const schema = new Schema({ x: String });
      const strings = [123, 456];
      assert.deepEqual(cast(schema, { x: strings }), { x: { $in: strings.map(String) } });
    });

    it('casts array with Numbers to $in query', function() {
      const schema = new Schema({ x: Number });
      const numbers = [42, 25];
      assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers } });
    });

    it('casts $in and $nin with empty array (gh-5913) (gh-7806)', function() {
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
    });

    it('casts array with Numbers to $in query when values are strings', function() {
      const schema = new Schema({ x: Number });
      const numbers = ['42', '25'];
      assert.deepEqual(cast(schema, { x: numbers }), { x: { $in: numbers.map(Number) } });
    });

    it('throws when Numbers are not valid', function() {
      const schema = new Schema({ x: Number });
      const numbers = [123, 456, 'asfds'];
      assert.throws(function() {
        cast(schema, { x: numbers });
      }, /Cast to Number failed for value "asfds"/);
    });
  });

  describe('$all', function() {
    it('casts $elemMatch (gh-11314)', async function() {
      const nested = new Schema({ _id: Number }, {});

      const schema = new Schema({ status: [nested] });

      const filter = {
        status: {
          $all: {
            $elemMatch: { _id: 42 }
          }
        }
      };

      assert.deepStrictEqual(cast(schema, filter), {
        status: {
          $all: [{ $elemMatch: { _id: 42 } }]
        }
      });
    });
  });

  describe('bitwise query operators: ', function() {
    it('with a number', function() {
      const schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllClear: 3 } }),
        { x: { $bitsAllClear: 3 } });
    });

    it('with an array', function() {
      const schema = new Schema({ x: Buffer });
      assert.deepEqual(cast(schema, { x: { $bitsAllSet: [2, '3'] } }),
        { x: { $bitsAllSet: [2, 3] } });
    });

    it('with a buffer', function() {
      const schema = new Schema({ x: Number });
      assert.deepEqual(cast(schema, { x: { $bitsAnyClear: Buffer.from([3]) } }),
        { x: { $bitsAnyClear: Buffer.from([3]) } });
    });

    it('throws when invalid', function() {
      const schema = new Schema({ x: Number });
      assert.throws(function() {
        cast(schema, { x: { $bitsAnySet: 'Not a number' } });
      }, /Cast to number failed/);
    });
  });

  describe('$expr', function() {
    it('does not get filtered out (gh-10662)', function() {
      const schema = new Schema({ spent: Number, budget: Number });
      const res = cast(schema, { $expr: { $gt: ['$spent', '$budget'] } }, { strict: true });
      assert.ok(res.$expr);
      assert.deepEqual(res.$expr.$gt, ['$spent', '$budget']);
    });
  });

  it('uses nested schema strict by default (gh-11291)', function() {
    const nested = new Schema({}, {
      id: false,
      _id: false,
      strict: false
    });

    const schema = new Schema({ roles: [String], customFields: nested });

    const res = cast(schema, {
      roles: { $ne: 'super' },
      'customFields.region': { $exists: true }
    });

    assert.deepEqual(res, {
      roles: { $ne: 'super' },
      'customFields.region': { $exists: true }
    });
  });

  it('avoids setting stripped out nested schema values to undefined (gh-11291)', function() {
    const nested = new Schema({}, {
      id: false,
      _id: false,
      strict: false
    });

    const schema = new Schema({ roles: [String], customFields: nested });

    const res = cast(schema, {
      roles: { $ne: 'super' },
      'customFields.region': { $exists: true }
    }, { strictQuery: true });

    assert.deepEqual(res, {
      roles: { $ne: 'super' }
    });
  });

  it('uses schema-level strictQuery over schema-level strict (gh-12508)', function() {
    const schema = new Schema({}, {
      strict: 'throw',
      strictQuery: false
    });

    const res = cast(schema, {
      name: 'foo'
    });

    assert.deepEqual(res, {
      name: 'foo'
    });
  });
});
