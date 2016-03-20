
/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    DivergentArrayError = mongoose.Error.DivergentArrayError,
    utils = require('../lib/utils'),
    random = utils.random;

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

  var db, C, M;

  before(function(done) {
    db = start();
    C = db.model('Child', {_id: Number, name: String}, 'child-' + random());
    M = db.model('Parent', {array: {type: [{type: Number, ref: 'Child'}]}}, 'parent-' + random());

    C.create(
        {_id: 0, name: 'zero'}
      , {_id: 1, name: 'one'}
      , {_id: 2, name: 'two'}, function(err) {
        assert.ifError(err);
        M.create({array: [0, 1, 2]}, function(err) {
          assert.ifError(err);
          done();
        });
      });
  });

  after(function(done) {
    db.close(done);
  });

  function test(check, fn) {
    it('using $set', function(done) {
      fn(function(err, doc) {
        assert.ifError(err);
        doc.array.unshift({_id: 10, name: 'ten'});
        doc.save(function(err) {
          check(err);
          done();
        });
      });
    });
    it('using $pop 1', function(done) {
      fn(function(err, doc) {
        assert.ifError(err);
        doc.array.$pop();
        doc.save(function(err) {
          check(err);
          done();
        });
      });
    });
    it('using $pop -1', function(done) {
      fn(function(err, doc) {
        assert.ifError(err);
        doc.array.$shift();
        doc.save(function(err) {
          check(err);
          done();
        });
      });
    });
  }

  function testOk(fn) {
    test(assert.ifError.bind(assert), fn);
  }

  function testFails(fn) {
    test(function(err) {
      assert.ok(err instanceof DivergentArrayError, 'non-divergent error: ' + err);
      assert.ok(/\sarray/.test(err.message));
    }, fn);
  }

  describe('from match', function() {
    testFails(function(cb) {
      M.findOne().populate({path: 'array', match: {name: 'one'}}).exec(cb);
    });
  });
  describe('from skip', function() {
    describe('2', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', options: {skip: 2}}).exec(cb);
      });
    });
    describe('0', function() {
      testOk(function(cb) {
        M.findOne().populate({path: 'array', options: {skip: 0}}).exec(cb);
      });
    });
  });
  describe('from limit', function() {
    describe('0', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', options: {limit: 0}}).exec(cb);
      });
    });
    describe('1', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', options: {limit: 1}}).exec(cb);
      });
    });
  });
  describe('from deselected _id', function() {
    describe('using string and only -_id', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', select: '-_id'}).exec(cb);
      });
    });
    describe('using string', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', select: 'name -_id'}).exec(cb);
      });
    });
    describe('using object and only _id: 0', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', select: {_id: 0}}).exec(cb);
      });
    });
    describe('using object', function() {
      testFails(function(cb) {
        M.findOne().populate({path: 'array', select: {_id: 0, name: 1}}).exec(cb);
      });
    });
  });
});
