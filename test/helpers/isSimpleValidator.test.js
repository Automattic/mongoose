'use strict';

const assert = require('assert');
const isFlatObject = require('../../lib/helpers/isFlatObject');
const MongooseDocumentArray = require('../../lib/types/DocumentArray');

describe('isFlatObject', function () {
  it('empty object', function () {
    assert.ok(isFlatObject({}));
  });
  it('object with one primitive attribute', function () {
    assert.ok(isFlatObject({ a: 1 }));
    assert.ok(isFlatObject({ a: 1n }));
    assert.ok(isFlatObject({ a: 'primitive' }));
    assert.ok(isFlatObject({ a: true }));
  });
  it('object with one simple array attribute', function () {
    assert.ok(isFlatObject({ a: [1] }));
    assert.ok(isFlatObject({ a: [1n] }));
    assert.ok(isFlatObject({ a: ['primitive'] }));
    assert.ok(isFlatObject({ a: ['primitive'] }));
    assert.ok(isFlatObject({ a: ['primitive', 'primitive'] }));
    assert.ok(isFlatObject({ a: [new Date()] }));
    assert.ok(isFlatObject({ a: [true] }));
  });
  it('object with some native objects', function () {
    assert.ok(!isFlatObject({ a: /a/g }));
    assert.ok(!isFlatObject({ a: new Date() }));
  });
  it('object with one sub object', function () {
    assert.ok(!isFlatObject({ a: {} }));
    assert.ok(!isFlatObject({ a: [{}] }));
    assert.ok(!isFlatObject({ a: { b: 1 } }));
  });
  it('object with one attribute of type MongooseDocumentArray', function () {
    assert.ok(isFlatObject({ a: new MongooseDocumentArray([ "a" ]) }));
    assert.ok(!isFlatObject({ a: new MongooseDocumentArray([{}]) }));
  });
});
