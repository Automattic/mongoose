/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const storeShard = require('../lib/plugins/sharding').storeShard;

const mongoose = start.mongoose;

describe('sharding', function() {
  it('should handle shard keys properly (gh-2127)', function(done) {
    const mockSchema = {
      options: {
        shardKey: {date: 1}
      }
    };
    const Stub = function() {
      this.schema = mockSchema;
      this.$__ = {};
    };
    Stub.prototype.__proto__ = mongoose.Document.prototype;
    const d = new Stub();
    const currentTime = new Date();
    d._doc = {date: currentTime};

    storeShard.call(d);
    assert.equal(d.$__.shardval.date, currentTime);
    done();
  });
});

describe('toObject()', function() {
  let Stub;

  beforeEach(function() {
    Stub = function() {
      const schema = this.schema = {
        options: {toObject: {minimize: false, virtuals: true}},
        virtuals: {virtual: 'test'}
      };
      this._doc = {empty: {}};
      this.get = function(path) { return schema.virtuals[path]; };
      this.$__ = {};
    };
    Stub.prototype = Object.create(mongoose.Document.prototype);
  });

  it('should inherit options from schema', function(done) {
    const d = new Stub();
    assert.deepEqual(d.toObject(), {empty: {}, virtual: 'test'});
    done();
  });

  it('can overwrite schema-set default options', function(done) {
    const d = new Stub();
    assert.deepEqual(d.toObject({minimize: true, virtuals: false}), {});
    done();
  });

  it('doesnt crash with empty object (gh-3130)', function(done) {
    const d = new Stub();
    d._doc = undefined;
    assert.doesNotThrow(function() {
      d.toObject();
    });
    done();
  });
});
