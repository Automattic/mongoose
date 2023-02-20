'use strict';

const assert = require('assert');
const isBsonType = require('../../lib/helpers/isBsonType');

const Decimal128 = require('mongodb').Decimal128;
const ObjectId = require('mongodb').ObjectId;

describe('isBsonType', () => {
  it('true for any object with _bsontype property equal typename', () => {
    assert.ok(isBsonType({ _bsontype: 'MyType' }, 'MyType'));
  });

  it('true for any object without _bsontype property and undefined typename', () => {
    assert.ok(isBsonType({ }));
  });

  it('false for any object with _bsontype property different of typename', () => {
    assert.ok(!isBsonType({ _bsontype: 'MyType' }, 'OtherType'));
  });

  it('false for any object without _bsontype property', () => {
    assert.ok(!isBsonType({ }, 'OtherType'));
  });

  it('true for Decimal128', () => {
    assert.ok(isBsonType(new Decimal128('123'), 'Decimal128'));
  });

  it('true for ObjectId', () => {
    assert.ok(isBsonType(new ObjectId(), 'ObjectId'));
  });
});
