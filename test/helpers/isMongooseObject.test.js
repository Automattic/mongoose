'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const isMongooseObject = require('../../lib/helpers/isMongooseObject');
const MongooseArray = require('../../lib/types/array');

describe('isMongooseObject', () => {
  it('is when value.$__ != null', () => {
    assert.ok(isMongooseObject({ $__: !null }));
  });

  it('is when value is a MongooseArray', () => {
    const mongooseArray = new MongooseArray();
    assert.ok(isMongooseObject(mongooseArray));
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
    assert.ok(!isMongooseObject(new Array()));
    assert.ok(!isMongooseObject(new Function()));
    assert.ok(!isMongooseObject(new Object()));
    assert.ok(!isMongooseObject(new RegExp()));
    assert.ok(!isMongooseObject(new String()));
    assert.ok(!isMongooseObject(Buffer.from([])));
  });
});
