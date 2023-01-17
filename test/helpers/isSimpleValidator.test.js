'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const isSimpleValidator = require('../../lib/helpers/isSimpleValidator');
const MongooseDocumentArray = require('../../lib/types/DocumentArray');

describe('isSimpleValidator', function() {
  it('empty object', function() {
    assert.ok(isSimpleValidator({}));
  });
  it('object with one primitive attribute', function() {
    assert.ok(isSimpleValidator({ a: 1 }));
    assert.ok(isSimpleValidator({ a: 1n }));
    assert.ok(isSimpleValidator({ a: 'primitive' }));
    assert.ok(isSimpleValidator({ a: true }));
  });
  it('object with one simple array attribute', function() {
    assert.ok(!isSimpleValidator({ a: [1] }));
    assert.ok(!isSimpleValidator({ a: [1n] }));
    assert.ok(!isSimpleValidator({ a: ['primitive'] }));
    assert.ok(!isSimpleValidator({ a: ['primitive'] }));
    assert.ok(!isSimpleValidator({ a: ['primitive', 'primitive'] }));
    assert.ok(!isSimpleValidator({ a: [new Date()] }));
    assert.ok(!isSimpleValidator({ a: [true] }));
  });
  it('object with some native objects', function() {
    assert.ok(!isSimpleValidator({ a: /a/g }));
    assert.ok(!isSimpleValidator({ a: new Date() }));
  });
  it('object with one sub object', function() {
    assert.ok(!isSimpleValidator({ a: {} }));
    assert.ok(!isSimpleValidator({ a: [{}] }));
    assert.ok(!isSimpleValidator({ a: { b: 1 } }));
  });
  it('object with one attribute of type MongooseDocumentArray', function() {
    assert.ok(!isSimpleValidator({ a: new MongooseDocumentArray(['a']) }));
    assert.ok(!isSimpleValidator({ a: new MongooseDocumentArray([{}]) }));
  });
});
