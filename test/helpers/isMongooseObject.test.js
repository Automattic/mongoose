'use strict';

const assert = require('assert');
const isMongooseObject = require('../../lib/helpers/isMongooseObject');

describe('isMongooseObject', () => {
  it('is when value.$__ != null', () => {
    assert.ok(isMongooseObject({ $__: !null }));
  });

  it('is when value.isMongooseArray is truthy', () => {
    assert.ok(isMongooseObject({ isMongooseArray: true }));
  });

  it('is when value.isMongooseBuffer is truthy', () => {
    assert.ok(isMongooseObject({ isMongooseBuffer: true }));
  });

  it('is when value.$isMongooseMap is truthy', () => {
    assert.ok(isMongooseObject({ $isMongooseMap: true }));
  });

  it('is not when anything else', () => {
    assert.ok(!isMongooseObject(''));
    assert.ok(!isMongooseObject([]));
    assert.ok(!isMongooseObject({}));
    assert.ok(!isMongooseObject(/./));
    assert.ok(!isMongooseObject(null));
    assert.ok(!isMongooseObject(false));
    assert.ok(!isMongooseObject(undefined));
    assert.ok(!isMongooseObject(new Array));
    assert.ok(!isMongooseObject(new Function));
    assert.ok(!isMongooseObject(new Object));
    assert.ok(!isMongooseObject(new RegExp));
    assert.ok(!isMongooseObject(new String));
    assert.ok(!isMongooseObject(Buffer.from([])));
  });
});