var assert = require('power-assert');
var updateValidators = require('../lib/services/updateValidators');
var emitter = require('events').EventEmitter;

describe('updateValidators', function() {
  var schema;

  beforeEach(function() {
    schema = {};
    schema._getSchema = function(p) {
      schema._getSchema.calls.push(p);
      return schema;
    };
    schema._getSchema.calls = [];
    schema.doValidate = function(v, cb) {
      schema.doValidate.calls.push({v: v, cb: cb});
      schema.doValidate.emitter.emit('called', {v: v, cb: cb});
    };
    schema.doValidate.calls = [];
    schema.doValidate.emitter = new emitter();
  });

  describe('validators', function() {
    it('flattens paths', function(done) {
      var fn = updateValidators({}, schema, {test: {a: 1, b: null}}, {});
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
      var dt = new Date();
      var fn = updateValidators({}, schema, {test: dt}, {});
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
      var fn = updateValidators({}, schema, {test: []}, {});
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
  });
});
