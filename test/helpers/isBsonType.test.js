'use strict';

const assert = require('assert');
const isBsonType = require('../../lib/helpers/isBsonType');

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
});