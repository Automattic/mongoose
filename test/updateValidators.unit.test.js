var assert = require('assert');
var updateValidators = require('../lib/services/updateValidators');
var emitter = require('events').EventEmitter;

describe('updateValidators', function() {
  var schema;

  beforeEach(function() {
    schema = {};
    schema.path = function(p) {
      schema.path.calls.push(p);
      return schema;
    };
    schema.path.calls = [];
    schema.doValidate = function(v, cb) {
      schema.doValidate.calls.push({ v: v, cb: cb });
      schema.doValidate.emitter.emit('called', { v: v, cb: cb });
    };
    schema.doValidate.calls = [];
    schema.doValidate.emitter = new emitter();
  });

  describe('validators', function() {
    it('flattens paths', function(done) {
      var fn = updateValidators({}, schema, { test: { a: 1, b: null } }, {});
      schema.doValidate.emitter.on('called', function(args) {
        args.cb();
      });
      fn(function(err) {
        assert.ifError(err);
        assert.equal(schema.path.calls.length, 4);
        assert.equal(schema.doValidate.calls.length, 2);
        assert.equal('test.a', schema.path.calls[0]);
        assert.equal('test.b', schema.path.calls[1]);
        assert.equal('test.a', schema.path.calls[2]);
        assert.equal('test.b', schema.path.calls[3]);
        assert.equal(1, schema.doValidate.calls[0].v);
        assert.equal(null, schema.doValidate.calls[1].v);
        done();
      });
    });

    it('doesnt flatten dates (gh-3194)', function(done) {
      var dt = new Date();
      var fn = updateValidators({}, schema, { test: dt }, {});
      schema.doValidate.emitter.on('called', function(args) {
        args.cb();
      });
      fn(function(err) {
        assert.ifError(err);
        assert.equal(schema.path.calls.length, 2);
        assert.equal(schema.doValidate.calls.length, 1);
        assert.equal('test', schema.path.calls[0]);
        assert.equal('test', schema.path.calls[1]);
        assert.equal(dt, schema.doValidate.calls[0].v);
        done();
      });
    });
  });
});
