/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const storeShard = require('../lib/plugins/sharding').storeShard;

const mongoose = start.mongoose;

describe('sharding', function() {
  it('should handle shard keys properly (gh-2127)', function() {
    const mockSchema = {
      options: {
        shardKey: { date: 1 }
      }
    };
    const Stub = function() {
      this.$__schema = mockSchema;
      this.$__ = {};
    };
    Object.setPrototypeOf(Stub.prototype, mongoose.Document.prototype);
    const d = new Stub();
    const currentTime = new Date();
    d._doc = { date: currentTime };

    storeShard.call(d);
    assert.equal(d.$__.shardval.date, currentTime);
  });
});

describe('toObject()', function() {
  let Stub;

  beforeEach(function() {
    Stub = function() {
      this.$__schema = {
        options: { toObject: { minimize: false, virtuals: true } },
        virtuals: { virtual: { applyGetters: () => 'test' } }
      };
      this.$__schema._defaultToObjectOptions = () => this.$__schema.options.toObject;
      this.$__schema.pathsWithTransforms = () => [];
      this._doc = { empty: {} };
      this.$__ = {};
    };
    Stub.prototype = Object.create(mongoose.Document.prototype);
  });

  it('should inherit options from schema', function() {
    const d = new Stub();
    assert.deepEqual(d.toObject(), { empty: {}, virtual: 'test' });
  });

  it('can overwrite schema-set default options', function() {
    const d = new Stub();
    assert.deepEqual(d.toObject({ minimize: true, virtuals: false }), {});
  });

  it('doesnt crash with empty object (gh-3130)', function() {
    const d = new Stub();
    d._doc = undefined;
    d.toObject();
  });
});

describe('Document.prototype.set() square bracket notation (gh-11552)', function() {
  it('supports square bracket notation in string paths', function() {
    const schema = new mongoose.Schema({
      name: String,
      configurations: [new mongoose.Schema({ value: String }, { _id: false })]
    });
    const Model = mongoose.model('DocumentUnitSetBracketString', schema);

    const doc = new Model({
      name: 'test',
      configurations: [{ value: 'a' }, { value: 'b' }]
    });
    doc.set('configurations[0].value', 'changed');

    assert.equal(doc.configurations[0].value, 'changed');
    assert.equal(doc.configurations[1].value, 'b');
    assert.ok(doc.isModified('configurations.0.value'));
  });

  it('supports square bracket notation in object keys', function() {
    const schema = new mongoose.Schema({
      configurations: [new mongoose.Schema({
        loopItemsQueryPaths: [[new mongoose.Schema({ value: String }, { _id: false })]]
      }, { _id: false })]
    });
    const Model = mongoose.model('DocumentUnitSetBracketObject', schema);

    const doc = new Model({
      configurations: [{ loopItemsQueryPaths: [] }]
    });
    doc.set({
      'configurations[0].loopItemsQueryPaths': [[{ value: '//div' }]]
    });

    assert.equal(doc.configurations[0].loopItemsQueryPaths[0][0].value, '//div');
  });

  it('supports consecutive square brackets for nested arrays', function() {
    const schema = new mongoose.Schema({
      matrix: [[String]]
    });
    const Model = mongoose.model('DocumentUnitSetBracketNested', schema);

    const doc = new Model({ matrix: [['a', 'b'], ['c', 'd']] });
    doc.set('matrix[1][0]', 'changed');

    assert.equal(doc.matrix[1][0], 'changed');
    assert.equal(doc.matrix[0][0], 'a');
  });
});
