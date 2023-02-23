
/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const DivergentArrayError = mongoose.Error.DivergentArrayError;

/**
 * Tests.
 */

describe('model: populate: divergent arrays', function() {
  // match
  // skip
  // limit
  // -_id
  //
  // $set
  // $pop -1
  // $pop 1

  let db, C, M;

  before(async function() {
    db = start();
    C = db.model('Child', { _id: Number, name: String });
    M = db.model('Parent', { array: { type: [{ type: Number, ref: 'Child' }] } });

    await C.create(
      { _id: 0, name: 'zero' },
      { _id: 1, name: 'one' },
      { _id: 2, name: 'two' }
    );

    await M.create({ array: [0, 1, 2] });
  });

  after(async function() {
    await db.close();
  });

  function test(check, fn) {
    it('using $set', async function() {
      const doc = await fn();
      doc.array.unshift({ _id: 10, name: 'ten' });
      const err = await doc.save().then(() => null, err => err);
      check(err);
    });
    it('using $pop 1', async function() {
      const doc = await fn();
      doc.array.$pop();
      const err = await doc.save().then(() => null, err => err);
      check(err);
    });
    it('using $pop -1', async function() {
      const doc = await fn();
      doc.array.$shift();
      const err = await doc.save().then(() => null, err => err);
      check(err);
    });
  }

  function testOk(fn) {
    test(err => assert.ifError(err), fn);
  }

  function testFails(fn) {
    test(function(err) {
      assert.ok(err instanceof DivergentArrayError, 'non-divergent error: ' + err);
      assert.ok(/\sarray/.test(err.message));
    }, fn);
  }

  describe('from match', function() {
    testFails(() => {
      return M.findOne().populate({ path: 'array', match: { name: 'one' } });
    });
  });
  describe('from skip', function() {
    describe('2', function() {
      testFails(() => {
        return M.findOne().populate({ path: 'array', options: { skip: 2 } });
      });
    });
    describe('0', function() {
      testOk(function() {
        return M.findOne().populate({ path: 'array', options: { skip: 0 } });
      });
    });
  });
  describe('from limit', function() {
    describe('0', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', options: { limit: 0 } }).exec();
      });
    });
    describe('1', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', options: { limit: 1 } }).exec();
      });
    });
  });
  describe('from deselected _id', function() {
    describe('using string and only -_id', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', select: '-_id' }).exec();
      });
    });
    describe('using string', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', select: 'name -_id' }).exec();
      });
    });
    describe('using object and only _id: 0', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', select: { _id: 0 } }).exec();
      });
    });
    describe('using object', function() {
      testFails(function() {
        return M.findOne().populate({ path: 'array', select: { _id: 0, name: 1 } }).exec();
      });
    });
  });
});
