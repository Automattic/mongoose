'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('timestamps', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('does not override timestamp params defined in schema (gh-4868)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
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
    const M = db.model('gh4868', schema);

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

  it('updatedAt without createdAt (gh-5598)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const M = db.model('gh5598', schema);

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

  it('updatedAt without createdAt for nested (gh-5598)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: null, updatedAt: true } });
    const parentSchema = new mongoose.Schema({
      child: schema
    });
    const M = db.model('gh5598_0', parentSchema);

    M.create({ child: { name: 'test' } }, function(error) {
      assert.ifError(error);
      M.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.child.createdAt);
        assert.ok(doc.child.updatedAt);
        assert.ok(doc.child.updatedAt.valueOf() >= startTime);
        done();
      });
    });
  });

  it('nested paths (gh-4503)', function(done) {
    const startTime = Date.now();
    const schema = new mongoose.Schema({
      name: String
    }, { timestamps: { createdAt: 'ts.c', updatedAt: 'ts.a' } });
    const M = db.model('gh4503', schema);

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
    const startTime = Date.now();
    const schema = new mongoose.Schema({
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
    const M = db.model('gh4868_0', schema);

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
    const startTime = Date.now();
    const tsSchema = new mongoose.Schema({
      createdAt: {
        type: Date,
        select: false
      },
      updatedAt: {
        type: Date,
        select: true
      }
    });
    const schema = new mongoose.Schema({
      ts: tsSchema,
      name: String
    }, { timestamps: { createdAt: 'ts.createdAt', updatedAt: 'ts.updatedAt' } });
    const M = db.model('gh4868_1', schema);

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

  it('no timestamps added when parent/child timestamps explicitly false (gh-7202)', function(done) {
    const subSchema = new Schema({}, { timestamps: false });
    const schema = new Schema({ sub: subSchema }, { timestamps: false });

    const Test = db.model('gh7202', schema);
    const test = new Test({ sub: {} });

    test.save((err, saved) => {
      assert.ifError(err);
      assert.strictEqual(saved.createdAt, undefined);
      assert.strictEqual(saved.updatedAt, undefined);
      assert.strictEqual(saved.sub.createdAt, undefined);
      assert.strictEqual(saved.sub.updatedAt, undefined);
      done();
    });
  });

  it('avoids calling createdAt getters when setting updatedAt (gh-7496)', function() {
    const modelSchema = new Schema({
      createdAt: {
        type: Date,
        get: (date) => date && date.valueOf() / 1000,
      },
      updatedAt: {
        type: Date,
        get: (date) => date && date.valueOf() / 1000,
      },
    }, { timestamps: true });

    const Model = db.model('gh7496', modelSchema);

    const start = new Date();
    return Model.create({}).then(doc => {
      assert.ok(doc._doc.createdAt.valueOf() >= start.valueOf());
      assert.ok(doc._doc.updatedAt.valueOf() >= start.valueOf());
    });
  });

  it('handles custom statics that conflict with built-in functions (gh-7698)', function() {
    const schema = new mongoose.Schema({ name: String }, { timestamps: true });

    let called = 0;
    schema.statics.updateOne = function() {
      ++called;
      return mongoose.Model.updateOne.apply(this, arguments);
    };
    const M = db.model('gh7698', schema);

    const startTime = Date.now();
    return M.updateOne({}, { name: 'foo' }, { upsert: true }).
      then(() => assert.equal(called, 1)).
      then(() => M.findOne()).
      then(doc => assert.ok(doc.createdAt.valueOf() >= startTime));
  });

  it('timestamps handle reusing child schemas (gh-7712)', function() {
    const childSchema = new mongoose.Schema({ name: String }, {
      timestamps: true
    });
    const M1 = db.model('gh7712', new mongoose.Schema({ child: childSchema }));
    db.model('gh7712_1', new mongoose.Schema({
      children: [childSchema]
    }));

    let startTime = null;
    return M1.create({ child: { name: 'foo' } }).
      then(() => new Promise(resolve => setTimeout(resolve, 25))).
      then(() => M1.findOne()).
      then(doc => {
        assert.ok(doc.child.updatedAt);
        startTime = Date.now();
        return M1.findOneAndUpdate({}, { $set: { 'child.name': 'bar' } }, { new: true });
      }).
      then(doc => {
        assert.ok(doc.child.updatedAt.valueOf() >= startTime,
          `Timestamp not updated: ${doc.child.updatedAt}`);
      });
  });
});
