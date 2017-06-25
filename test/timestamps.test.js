'use strict';

var assert = require('assert');
var start = require('./common');

var mongoose = start.mongoose;

describe('timestamps', function() {
  var db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('does not override timestamp params defined in schema (gh-4868)', function(done) {
    var startTime = Date.now();
    var schema = new mongoose.Schema({
      createdAt: {
        type: Date,
        select: false
      },
      updatedAt: {
        type: Date,
        select: true
      },
      name: String
    }, { timestamps: true });
    var M = db.model('gh4868', schema);

    M.create({ name: 'Test' }, function(error) {
      assert.ifError(error);
      M.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('nested paths (gh-4503)', function(done) {
    var startTime = Date.now();
    var schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: 'ts.c', updatedAt: 'ts.a' } });
    var M = db.model('gh4503', schema);

    M.create({ name: 'Test' }, function(error) {
      assert.ifError(error);
      M.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.ok(doc.ts.c);
        assert.ok(doc.ts.c.valueOf() >= startTime);
        assert.ok(doc.ts.a);
        assert.ok(doc.ts.a.valueOf() >= startTime);
        done();
      });
    });
  });

  it('does not override nested timestamp params defined in schema (gh-4868)', function(done) {
    var startTime = Date.now();
    var schema = new mongoose.Schema({
      ts: {
        createdAt: {
          type: Date,
          select: false
        },
        updatedAt: {
          type: Date,
          select: true
        }
      },
      name: String
    }, { timestamps: { createdAt: 'ts.createdAt', updatedAt: 'ts.updatedAt' } });
    var M = db.model('gh4868_0', schema);

    M.create({ name: 'Test' }, function(error) {
      assert.ifError(error);
      M.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.ts.createdAt);
        assert.ok(doc.ts.updatedAt);
        assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('does not override timestamps in nested schema (gh-4868)', function(done) {
    var startTime = Date.now();
    var tsSchema = new mongoose.Schema({
      createdAt: {
        type: Date,
        select: false
      },
      updatedAt: {
        type: Date,
        select: true
      }
    });
    var schema = new mongoose.Schema({
      ts: tsSchema,
      name: String
    }, { timestamps: { createdAt: 'ts.createdAt', updatedAt: 'ts.updatedAt' } });
    var M = db.model('gh4868_1', schema);

    M.create({ name: 'Test' }, function(error) {
      assert.ifError(error);
      M.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.ts.createdAt);
        assert.ok(doc.ts.updatedAt);
        assert.ok(doc.ts.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });
});
