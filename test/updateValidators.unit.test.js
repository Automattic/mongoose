'use strict';

require('./common');

const Schema = require('../lib/schema');
const assert = require('assert');
const updateValidators = require('../lib/helpers/updateValidators');
const emitter = require('events').EventEmitter;

describe('updateValidators', function() {
  let schema;

  beforeEach(function() {
    schema = {};
    schema._getSchema = function(p) {
      schema._getSchema.calls.push(p);
      return schema;
    };
    schema._getSchema.calls = [];
    schema.doValidate = function(v, cb) {
      schema.doValidate.calls.push({ v: v, cb: cb });
      schema.doValidate.emitter.emit('called', { v: v, cb: cb });
    };
    schema.doValidate.calls = [];
    schema.doValidate.emitter = new emitter();
  });

  describe('validators', function() {
    it('flattens paths', function(done) {
      const fn = updateValidators({}, schema, { test: { a: 1, b: null } }, {});
      schema.doValidate.emitter.on('called', function(args) {
        args.cb();
      });
      fn(function(err) {
        assert.ifError(err);
        assert.equal(schema._getSchema.calls.length, 3);
        assert.equal(schema.doValidate.calls.length, 3);
        assert.equal(schema._getSchema.calls[0], 'test');
        assert.equal(schema._getSchema.calls[1], 'test.a');
        assert.equal(schema._getSchema.calls[2], 'test.b');
        assert.deepEqual(schema.doValidate.calls[0].v, {
          a: 1,
          b: null
        });
        assert.equal(schema.doValidate.calls[1].v, 1);
        assert.equal(schema.doValidate.calls[2].v, null);
        done();
      });
    });

    it('doesnt flatten dates (gh-3194)', function(done) {
      const dt = new Date();
      const fn = updateValidators({}, schema, { test: dt }, {});
      schema.doValidate.emitter.on('called', function(args) {
        args.cb();
      });
      fn(function(err) {
        assert.ifError(err);
        assert.equal(schema._getSchema.calls.length, 1);
        assert.equal(schema.doValidate.calls.length, 1);
        assert.equal(schema._getSchema.calls[0], 'test');
        assert.equal(dt, schema.doValidate.calls[0].v);
        done();
      });
    });

    it('doesnt flatten empty arrays (gh-3554)', function(done) {
      const fn = updateValidators({}, schema, { test: [] }, {});
      schema.doValidate.emitter.on('called', function(args) {
        args.cb();
      });
      fn(function(err) {
        assert.ifError(err);
        assert.equal(schema._getSchema.calls.length, 1);
        assert.equal(schema.doValidate.calls.length, 1);
        assert.equal(schema._getSchema.calls[0], 'test');
        assert.deepEqual(schema.doValidate.calls[0].v, []);
        done();
      });
    });

    it('doesnt flatten decimal128 (gh-7561)', function(done) {
      const Decimal128Type = require('../lib/types/decimal128');
      const schema = Schema({ test: { type: 'Decimal128', required: true } });
      const fn = updateValidators({}, schema, {
        test: new Decimal128Type('33.426')
      }, {});
      fn(function(err) {
        assert.ifError(err);
        done();
      });
    });

    it('handles nested paths correctly (gh-3587)', function(done) {
      const schema = Schema({
        nested: {
          a: { type: String, required: true },
          b: { type: String, required: true }
        }
      });
      const fn = updateValidators({}, schema, {
        nested: { b: 'test' }
      }, {});
      fn(function(err) {
        assert.ok(err);
        assert.deepEqual(Object.keys(err.errors), ['nested.a']);
        done();
      });
    });
  });
});
