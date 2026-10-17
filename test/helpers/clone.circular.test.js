'use strict';

const assert = require('assert');
const mongoose = new (require('../..').Mongoose)();
const clone = require('../../lib/helpers/clone');

describe('clone circular arrays', () => {
  it('preserves a circular array when serializing a Mixed path', () => {
    const schema = new mongoose.Schema({ value: mongoose.Schema.Types.Mixed });
    const Model = mongoose.model('CloneCircularArray', schema);
    const value = [];
    value.push(value);
    const doc = new Model({ value });

    const result = doc.toObject();
    assert.notStrictEqual(result.value, value);
    assert.strictEqual(result.value[0], result.value);
    mongoose.deleteModel('CloneCircularArray');
  });

  it('preserves mutual array references when tracking visited objects', () => {
    const first = [];
    const second = [first];
    first.push(second);
    const result = clone(first, { _seen: new Map() });
    assert.notStrictEqual(result, first);
    assert.notStrictEqual(result[0], second);
    assert.strictEqual(result[0][0], result);
  });

  it('reuses shared arrays when tracking visited objects', () => {
    const shared = [{ value: 1 }];
    const result = clone({ first: shared, second: shared }, { _seen: new Map() });
    assert.notStrictEqual(result.first, shared);
    assert.notStrictEqual(result.first[0], shared[0]);
    assert.strictEqual(result.first, result.second);
  });
});
